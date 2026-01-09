@echo off
REM Creates a local git branch and commits the current state as a stepping-stone snapshot.
REM Run this from the repository root in a Windows shell where git is available.

set BRANCH_NAME=stepping-stone-%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set BRANCH_NAME=%BRANCH_NAME: =0%

echo Creating branch %BRANCH_NAME%
git checkout -b %BRANCH_NAME%
if %errorlevel% neq 0 (
  echo Failed to create branch. Aborting.
  exit /b 1
)

echo Staging changes...
git add -A
if %errorlevel% neq 0 (
  echo git add failed. Aborting.
  exit /b 1
)

echo Committing snapshot...
git commit -m "chore: stepping-stone snapshot"
if %errorlevel% neq 0 (
  echo Commit failed. You may have nothing to commit or an error occurred.
  exit /b 1
)

echo Snapshot committed on branch %BRANCH_NAME%.
echo To push: git push origin %BRANCH_NAME%
