import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.createCodebaseChunks', async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
      vscode.window.showErrorMessage('Please open a workspace folder first.');
      return;
    }
    const root = folders[0].uri.fsPath;

    // Ask for max chunk size
    const defaultMax = '80000';
    const input = await vscode.window.showInputBox({
      prompt: 'Max characters per chunk (e.g. 30000)',
      value: defaultMax
    });
    const max = parseInt(input || defaultMax, 10);
    if (isNaN(max) || max <= 0) {
      vscode.window.showErrorMessage('Invalid max chunk size.');
      return;
    }

    // Collect all text files, excluding node_modules and the output folder
    const allFiles = await vscode.workspace.findFiles(
      // Include Python files now as well
      '**/*.{ts,js,jsx,tsx,html,css,json,md,py}',
      '**/node_modules/**'
    );
    const files = allFiles.filter(file => {
      const base = path.basename(file.fsPath);
      const isOutput = file.fsPath.includes(path.join(root, '.vscode-chunker') + path.sep);
      return base !== 'package-lock.json' && !isOutput;
    });

    // Concatenate contents
    let allText = '';
    for (const file of files) {
      try {
        const content = fs.readFileSync(file.fsPath, 'utf-8');
        allText += `\n\n// File: ${path.relative(root, file.fsPath)}\n${content}`;
      } catch {
        // Skip unreadable files
      }
    }

    // Prepare output folder
    const outputDir = path.join(root, '.vscode-chunker');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Split and write chunk files
    const totalChunks = Math.ceil(allText.length / max);
    for (let idx = 0; idx < totalChunks; idx++) {
      const chunkText = allText.slice(idx * max, (idx + 1) * max);
      const fileName = `chunk-${idx + 1}-of-${totalChunks}.txt`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, chunkText, 'utf-8');
    }

    vscode.window.showInformationMessage(
      `Wrote ${totalChunks} chunks to .vscode-chunker/. Add that to your .gitignore.`
    );
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {}
