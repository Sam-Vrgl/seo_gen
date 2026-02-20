# SEO Gen

A fast application to generate SEO summaries using various document sources.

## Getting Started (Windows)

This guide explains how to start the app from an empty Windows PC, using a single command that runs both the frontend and the backend. Localhost is sufficient for access.

### 1. Prerequisites (Install Bun)
This project requires **Bun**, a fast JavaScript runtime. If you don't already have it installed, follow these steps:

1. Open **Windows PowerShell** (search for "PowerShell" in your Start Menu).
2. Copy the following command, paste it into the PowerShell window, and press **Enter**:
   ```ps1
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
3. Wait for the installation to finish.
4. **Close** the PowerShell window so the changes take effect.

### 2. Launch the Application

Once you have downloaded the code onto your computer, you can start all services with a single command!

1. Open this project directory (`seo_gen`) in File Explorer.
2. Double-click the `start.bat` file.
   - *Alternatively, open a Command Prompt inside the folder and type `start.bat`.*

The script will automatically:
- Download and install all required project dependencies.
- Open the backend server in a new command window.
- Open the frontend website in a new command window.

Enjoy! The tool will be accessible on your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**
