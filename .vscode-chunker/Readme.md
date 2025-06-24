# Codebase Chunker (VS Code Extension)

This extension splits your workspace codebase into prompt-sized `.txt` chunks to easily copy into ChatGPT or any LLM.

---

## ✅ How to Use (Recommended Method)

This is how you use the chunker **after packaging and installing it**.

### 1. Install the Extension (once)

Package and install your `.vsix`:

```bash
npm install -g @vscode/vsce   # or `vsce` if already installed
vsce package                  # creates vscode-chunker-0.0.X.vsix
code --install-extension vscode-chunker-0.0.X.vsix

2. Run the Chunker
Open the project you want to chunk

Press Ctrl+Shift+P / Cmd+Shift+P to open the Command Palette

Create Codebase Chunk Files
Enter a max chunk size (default: 30000)

A .vscode-chunker/ folder will appear in your project with chunked .txt files

3. Grab Your Chunks
Open .vscode-chunker/

Copy the content of each chunk-1-of-N.txt, chunk-2-of-N.txt, etc.

Paste into ChatGPT one chunk at a time

🧪 How to Debug or Modify the Extension
Use this only if you're developing the extension source (.vscode-chunker/).

1. Open the extension folder only
Use File → Open Folder… → select only the vscode-chunker folder.

You should see:

.vscode/
node_modules/
out/
src/
package.json
tsconfig.json
If you see app files, you're in the wrong root.

2. Run the Extension
Open the Run and Debug view (🐞 icon)

Select the launch target: Run Codebase Chunker

Press the ▶️ button or hit F5

A new VS Code window (Extension Development Host) will open

3. Use the Chunker in the Host Window
In the Extension Host window, open your real project (File → Open Folder…)

Press Ctrl+Shift+P / Cmd+Shift+P

Run:


Create Codebase Chunk Files
Enter the max chunk size (default: 30000)

The .vscode-chunker/ folder will appear with chunk files
