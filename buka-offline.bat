@echo off
REM Buka website langsung dari folder ini, tanpa internet.
set "CH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" set "CH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CH%" (start "" "%~dp0index.html" & exit /b)
set "LOC=%~dp0index.html"
set "LOC=%LOC:\=/%"
start "" "%CH%" --app=file:///%LOC%#/dms-manual
