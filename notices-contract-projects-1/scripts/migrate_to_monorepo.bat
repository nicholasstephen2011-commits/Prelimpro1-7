@echo off
REM Migration script (Windows) to reorganize the repository into a monorepo layout.
REM Run from repository root in a shell with git available if you want git mv behavior.

setlocal enabledelayedexpansion

echo Creating folders PrelimPro-web PrelimPro-mobile shared
if not exist PrelimPro-web mkdir PrelimPro-web
if not exist PrelimPro-mobile mkdir PrelimPro-mobile
if not exist shared mkdir shared

call :mv_or_git app PrelimPro-mobile\app

if exist app.json (
  if exist PrelimPro-mobile\app.json (
    echo PrelimPro-mobile\app.json already exists — leaving root app.json as backup
    if exist package.json copy package.json package.json.root.bak
  ) else (
    call :mv_or_git app.json PrelimPro-mobile\app.json
  )
)

call :mv_or_git babel.config.js PrelimPro-mobile\babel.config.js
call :mv_or_git metro.config.js PrelimPro-mobile\metro.config.js

for %%d in (components contexts lib constants) do (
  if exist %%d (
    call :mv_or_git %%d shared\%%d
  ) else (
    echo Skipping missing: %%d
  )
)

if exist PrelimPro-mobile\package.json (
  echo PrelimPro-mobile\package.json already exists, leaving root package.json in place as backup
  if exist package.json copy package.json package.json.root.bak
) else (
  if exist package.json (
    call :mv_or_git package.json PrelimPro-mobile\package.json
  )
)

echo Migration complete. Run the stepping stone script to commit a snapshot.
goto :eof

:mv_or_git
set SRC=%1
set DEST=%2
if exist %SRC% (
  where git >nul 2>&1
  if %errorlevel% == 0 (
    echo git mv %SRC% %DEST%
    git mv %SRC% %DEST% || (
      echo git mv failed, falling back to move
      move %SRC% %DEST%
    )
  ) else (
    echo move %SRC% %DEST%
    move %SRC% %DEST%
  )
) else (
  echo Skipping missing: %SRC%
)
goto :eof
