@echo off
title THE SOUL VASTRA - Luxury Streetwear E-Commerce
echo ==============================================================
echo       THE SOUL VASTRA - WEAR YOUR LEGACY
echo   Premium Japanese-Inspired Streetwear E-Commerce Site
echo ==============================================================
echo.
echo Initializing database and starting secure production backend...
echo.

python -m backend.seed_data
start "" "http://localhost:8080/"
python -m backend.server

pause
