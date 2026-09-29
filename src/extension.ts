import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "aidocs" is now active!');


	const disposable = vscode.commands.registerCommand('aidocs.documentCode', async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
        	vscode.window.showWarningMessage('Editor window is closed');
        	return;
		}

		var languageId = editor.document.languageId;
		var selection = editor.selection;
		var selectedCode = editor.document.getText(selection);

		if (!selectedCode.trim()) {
        	vscode.window.showWarningMessage('No code to document');
        	return;
        }
		await vscode.window.withProgress(
        	{
        	location: vscode.ProgressLocation.Notification,
        	title: 'Requesting Copilot...',
        	cancellable: true,
        	},
			async (_progress, token) => {
          		try {	
					console.log('1. Команда вызвана');
					console.log('2. Язык:', languageId, 'Длина кода:', selectedCode.length);
					var models = await vscode.lm.selectChatModels({
						vendor: 'copilot',
						family: 'gpt-4o',
					});
					console.log('3. Найдено моделей:', models.length, models.map(m => m.id || m.family));
					var model = models[0];
					
					if (!model) {
						var allModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
						model = allModels[0];
					}
					if (!model) {
						vscode.window.showErrorMessage(
							'Unable to find Copilot model. Please, try again later'
						);
						return;
					}
					console.log('4. Отправляем запрос в модель:', model.id);
					
					var prompt = 'You are a senior developer in ' + languageId + '. You need to write a documentation for this piece of code, follow several rules STRICTLY:\n' +
						'1. Write a raw text ready to paste in the code, without any markdown (no ``` and similar SHIT) but with commenting symbols\n' +
						'2. Follow rules of documenting in ' + languageId + ' language\n' +
						'3. No other words describing the solution, ONLY docs for this piece\n\n' +
						'4. do NOT copy existing code, just write a documentation for it\n' +
						'Code:\n\n' +
						selectedCode;
					
					var response = await model.sendRequest(
						[vscode.LanguageModelChatMessage.User(prompt)],
						{},
						token
					);
					console.log('5. Ответ получен, читаем чанки...');
					let documentation = '';

					for await (const chunk of response.text) {
						documentation += chunk;
					}
					
					await editor.edit((editBuilder) => {
						var startLine = selection.start.line;
						var insertPosition = new vscode.Position(startLine, 0);
						var firstLineText = editor.document.lineAt(startLine).text;
						var baseIndent = firstLineText.match(/^\s*/)?.[0] || '';

						var lines = documentation.split('\n');
						var formattedLines = lines.map((line, idx) => {
							var trimmed = line.trim();
							if (!trimmed) {
								return '';
							}

							if (idx > 0 && trimmed.startsWith('*')) {
								return `${baseIndent} ${trimmed}`;
							}

							return `${baseIndent}${trimmed}`;
						});

						editBuilder.insert(insertPosition, formattedLines.join('\n') + '\n');
					});


				}
				catch (err: any) {
					vscode.window.showErrorMessage(`Request error: ${err.message}`);
				}
			}
		);

	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
