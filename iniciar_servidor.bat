@echo off
title Servidor Local Mandala Festivales
echo Iniciando servidor local en http://localhost:5050/ ...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
