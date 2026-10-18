@echo off
rem Molfar Vertep launcher: checks the tools, offers updates, starts the
rem engine and opens it in your browser. Works from wherever the app folder is.
rem
rem   Molfar-Vertep.bat            a menu of the choices below; with no key pressed
rem                                it starts after 10 seconds, as it always did:
rem                                offers the latest release (asks first), then starts
rem   Molfar-Vertep.bat dev        update to the newest work branch (claude/*) instead
rem   Molfar-Vertep.bat dev NAME   update to the work branch claude/NAME (another
rem                                session's newer branch does not take its place)
rem   Molfar-Vertep.bat nopull     start without checking for updates
rem   Molfar-Vertep.bat previous   go back to the release before the one you have
rem   Molfar-Vertep.bat yes        do not ask: take the update
rem   Molfar-Vertep.bat rebuild    reinstall packages and rebuild, then start
rem   Molfar-Vertep.bat tools      also check Git and Bun for updates
rem   Molfar-Vertep.bat shortcut   (re)create the desktop shortcut
rem Options combine: "Molfar-Vertep.bat dev yes". Any option skips the menu.
rem
rem Where it runs: the folder this file sits in. A copy of this file kept
rem somewhere else finds the app through the path the last run remembered
rem (%LOCALAPPDATA%\Molfar Vertep\app-path.txt); a desktop shortcut points
rem at the original. With no app anywhere, it offers to download one here.
rem
rem The release channel checks out a release tag, which leaves git on a
rem detached HEAD: "git pull" will not work there, and you do not need it,
rem this file does the updating. "dev" puts you back on a branch.
rem
rem Your data (the data folder) is never touched by an update: git ignores it.
rem This file is plain ASCII on purpose: cmd reads it with the console code page.

setlocal EnableExtensions DisableDelayedExpansion
set "MV_RC=0"

rem ---------- run from a copy ----------
rem git may replace this very file during an update, and cmd reads a batch
rem file as it goes, so the work runs from a copy in %TEMP%.
if /i "%~1"=="--from-copy" goto copied
rem copies left by windows closed with X; a newer one may still be running
forfiles /p "%TEMP%" /m "molfar-vertep-*.bat" /d -1 /c "cmd /c del /q @path" >nul 2>nul
set "MV_COPY=%TEMP%\molfar-vertep-%RANDOM%%RANDOM%.bat"
copy /y "%~f0" "%MV_COPY%" >nul 2>nul
if errorlevel 1 (
  echo %MV_E%Could not copy the launcher to %TEMP%. Starting from the original instead.%MV_0%
  set "MV_COPY="
  goto copied_direct
)
"%MV_COPY%" --from-copy "%~f0" %*

:copied_direct
set "MV_SELF=%~f0"
set "MV_RUNNING=%~f0"
goto args

:copied
rem %0 moves with shift: keep the running copy's path first
set "MV_RUNNING=%~f0"
set "MV_SELF=%~f2"
shift
shift

rem ---------- options ----------
:args
rem ---------- colours ----------
rem Message colours (Windows 10 consoles read these codes); empty, so plain
rem text, when the escape character cannot be made. H a step, S the start,
rem G done, W a note, E a failure, D a path or hint, K a command to type.
set "ESC="
for /f %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
set "MV_H=" & set "MV_S=" & set "MV_G=" & set "MV_W=" & set "MV_E=" & set "MV_D=" & set "MV_K=" & set "MV_0="
if not defined ESC goto colours_done
set "MV_H=%ESC%[38;2;214;160;76m"
set "MV_S=%ESC%[1;38;2;236;228;212m"
set "MV_G=%ESC%[38;2;120;190;110m"
set "MV_W=%ESC%[38;2;230;200;90m"
set "MV_E=%ESC%[38;2;225;85;85m"
set "MV_D=%ESC%[38;2;150;150;150m"
set "MV_K=%ESC%[38;2;236;228;212m"
set "MV_0=%ESC%[0m"
:colours_done

set "MV_DEV="
set "MV_NOPULL="
set "MV_YES="
set "MV_FULL="
set "MV_TOOLS="
set "MV_SHORTCUT="
set "MV_PICK="
set "MV_PREV="
set "MV_ARGS="
set "MV_TAKE="
set "MV_CLONED="
:args_loop
if "%~1"=="" goto args_done
set "MV_ARGS=1"
rem a word that is no option names the work branch
set "MV_KNOWN="
for %%o in (dev nopull yes -y rebuild tools shortcut previous) do if /i "%~1"=="%%o" set "MV_KNOWN=1"
if not defined MV_KNOWN set "MV_PICK=%~1"
if /i "%~1"=="dev" set "MV_DEV=1"
if /i "%~1"=="nopull" set "MV_NOPULL=1"
if /i "%~1"=="yes" set "MV_YES=1"
if /i "%~1"=="-y" set "MV_YES=1"
if /i "%~1"=="rebuild" set "MV_FULL=1"
if /i "%~1"=="tools" set "MV_TOOLS=1"
if /i "%~1"=="shortcut" set "MV_SHORTCUT=1"
if /i "%~1"=="previous" set "MV_PREV=1"
shift
goto args_loop
:args_done
if defined MV_PICK set "MV_DEV=1"

rem UTF-8 output, so folder names in any language print correctly
chcp 65001 >nul
title Molfar Vertep
set "MV_REPO=https://github.com/MolfarWav/Molfar.Vertep.git"
set "MV_STATE=%LOCALAPPDATA%\Molfar Vertep"
rem tools this file installs are found without reopening the window
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%PATH%"

rem ---------- where the app is ----------
for %%I in ("%MV_SELF%") do set "MV_HERE=%%~dpI"
if "%MV_HERE:~-1%"=="\" set "MV_HERE=%MV_HERE:~0,-1%"
set "APP=%MV_HERE%"
if exist "%APP%\package.json" if exist "%APP%\src\index.ts" goto app_found
rem (no paths inside parenthesized blocks below: a ")" in a folder name would end them)
set "APP="
if exist "%MV_STATE%\app-path.txt" set /p APP=<"%MV_STATE%\app-path.txt"
if not defined APP goto no_app_yet
if not exist "%APP%\package.json" goto no_app_yet
if not exist "%APP%\src\index.ts" goto no_app_yet
echo %MV_D%This launcher is not in the Molfar Vertep folder; using the one found last time:%MV_0%
echo %MV_D%  %APP%%MV_0%
goto app_found
:no_app_yet
set "APP="

rem ---------- tools ----------
:tools
where git >nul 2>nul
if errorlevel 1 (
  echo %MV_H%=== Installing Git, which Molfar Vertep needs ^(winget^)...%MV_0%
  winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
)
where git >nul 2>nul
if errorlevel 1 (
  echo %MV_E%Git is still not available. Install it from https://git-scm.com, then run this file again.%MV_0%
  goto fail
)
where bun >nul 2>nul
if errorlevel 1 (
  echo %MV_H%=== Installing Bun, which Molfar Vertep needs...%MV_0%
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
)
where bun >nul 2>nul
if errorlevel 1 (
  echo %MV_E%Bun is still not available. Install it from https://bun.sh, then run this file again.%MV_0%
  goto fail
)
set "MV_BUNV="
for /f "delims=" %%v in ('bun --version 2^>nul') do set "MV_BUNV=%%v"
set "MV_BMAJ=0"
set "MV_BMIN=0"
for /f "tokens=1,2 delims=." %%a in ("%MV_BUNV%") do (
  set "MV_BMAJ=%%a"
  set "MV_BMIN=%%b"
)
set "MV_BUN_OLD="
if %MV_BMAJ% LSS 1 set "MV_BUN_OLD=1"
if %MV_BMAJ% EQU 1 if %MV_BMIN% LSS 4 set "MV_BUN_OLD=1"
if defined MV_BUN_OLD (
  echo %MV_W%Bun %MV_BUNV% is older than 1.4.0, the version Molfar Vertep needs.%MV_0%
  call :ask "Update Bun now"
  if errorlevel 2 (
    echo %MV_W%Molfar Vertep may not install or build with this Bun.%MV_0%
  ) else (
    echo %MV_H%=== Updating Bun...%MV_0%
    call bun upgrade
  )
)
if defined MV_TOOLS (
  echo %MV_H%=== Checking Git for updates ^(winget^)...%MV_0%
  winget upgrade --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
  echo %MV_H%=== Checking Bun for updates...%MV_0%
  call bun upgrade
)
if defined APP goto app_ready

rem ---------- no app anywhere: download it ----------
set "APP=%MV_HERE%\Molfar-Vertep"
echo Molfar Vertep is not installed next to this file.
echo It can download it into:
echo %MV_D%  %APP%%MV_0%
call :ask "Download Molfar Vertep there"
if errorlevel 2 goto declined
echo %MV_H%=== Downloading Molfar Vertep...%MV_0%
git clone "%MV_REPO%" "%APP%"
if errorlevel 1 goto fail
set "MV_FULL=1"
set "MV_CLONED=1"
goto app_ready

:app_found
rem the tool checks still run, then come back here
if not defined MV_TOOLS_DONE (
  set "MV_TOOLS_DONE=1"
  goto tools
)

:app_ready
cd /d "%APP%" || goto fail
rem nothing below works when git refuses the folder: stop here, not at Bun
call :git_trust
if errorlevel 1 goto fail
if not exist "%MV_STATE%" mkdir "%MV_STATE%" >nul 2>nul
>"%MV_STATE%\app-path.txt" echo(%APP%
rem a copy cloned before the repository was renamed follows it under its new name
git remote set-url origin "%MV_REPO%" >nul 2>nul

rem ---------- start menu ----------
rem One key picks what to do; with none it starts after a few seconds, so the
rem desktop shortcut still just starts Molfar Vertep. Options skip the menu.
if defined MV_ARGS goto menu_done
if defined MV_CLONED goto menu_done
set "MV_MENU_WAIT=10"
:menu
call :version MV_NOW
set "MV_ON="
for /f "delims=" %%b in ('git symbolic-ref --quiet --short HEAD 2^>nul') do set "MV_ON=branch %%b"
if not defined MV_ON for /f "delims=" %%t in ('git describe --tags --exact-match 2^>nul') do set "MV_ON=release %%t"
if not defined MV_ON set "MV_ON=no release tag"
rem the logo once per run: after "C" the check's output stays above a plain menu
if defined MV_LOGO_DONE goto menu_plain
set "MV_LOGO_DONE=1"
call :logo
if errorlevel 1 goto menu_plain
rem the menu goes to the right of the star: 7 lines up, column 50
set "MV_C=%ESC%[50G"
set "MV_R=%ESC%[38;2;178;52;60m"
echo %ESC%[7A%MV_C%%ESC%[38;2;236;228;212m%MV_NOW%, %MV_ON%%MV_0%
echo %MV_C%%MV_R%1%MV_0%  Start (looks for a newer release first)
echo %MV_C%%MV_R%2%MV_0%  Start without looking for updates
echo %MV_C%%MV_R%3%MV_0%  Update to the latest release, then start
echo %MV_C%%MV_R%4%MV_0%  Newest work branch (dev), then start
echo %MV_C%%MV_R%5%MV_0%  Go back to the previous release
echo %MV_C%%MV_R%6%MV_0%  Check the files
echo %MV_C%%MV_R%7%MV_0%  Reinstall packages and rebuild, then start
echo %MV_C%%MV_R%0%MV_0%  Quit
echo.
goto menu_ask
:menu_plain
echo.
echo  Molfar Vertep %MV_NOW%, %MV_ON%
echo.
echo    1  Start (looks for a newer release first)
echo    2  Start without looking for updates
echo    3  Update to the latest release, then start
echo    4  Newest work branch (dev), then start
echo    5  Go back to the previous release
echo    6  Check the files
echo    7  Reinstall packages and rebuild, then start
echo    0  Quit
echo.
:menu_ask
if "%MV_MENU_WAIT%"=="0" goto menu_key
choice /c 12345670 /n /t %MV_MENU_WAIT% /d 1 /m "Press a number. With none, 1 in %MV_MENU_WAIT% seconds: "
goto menu_pick
:menu_key
choice /c 12345670 /n /m "Press a number: "
:menu_pick
set "MV_KEY=%errorlevel%"
if "%MV_KEY%"=="2" set "MV_NOPULL=1"
if "%MV_KEY%"=="3" set "MV_TAKE=1"
if "%MV_KEY%"=="4" set "MV_DEV=1"
if "%MV_KEY%"=="4" set "MV_TAKE=1"
if "%MV_KEY%"=="5" set "MV_PREV=1"
if "%MV_KEY%"=="6" goto check
if "%MV_KEY%"=="7" set "MV_FULL=1"
if "%MV_KEY%"=="7" set "MV_NOPULL=1"
rem errorlevel is the place in /c: 8 is the key 0
if "%MV_KEY%"=="8" goto done
:menu_done

if defined MV_PREV goto previous
if defined MV_NOPULL goto deps

rem ---------- updates ----------
echo %MV_H%=== Checking for updates...%MV_0%
git fetch --prune --tags --force origin
if errorlevel 1 (
  echo %MV_W%No connection to GitHub: starting the version you have.%MV_0%
  goto deps
)
rem your own changes to the engine's files are never overwritten
git diff --quiet HEAD -- . ":(exclude)bun.lock" ":(exclude)client-agent/bun.lock"
if not errorlevel 1 goto clean
echo %MV_W%Molfar Vertep's own files have local changes, so no update is applied.%MV_0%
echo %MV_W%"git status" in the app folder shows them. Starting the version you have.%MV_0%
goto deps
:clean

set "MV_TARGET="
set "MV_LABEL="
set "MV_BRANCH="
if defined MV_DEV goto pick_branch
for /f "delims=" %%t in ('git tag -l "v*" --sort^=-v:refname') do (
  if not defined MV_TARGET (
    echo %%t| findstr /r /x "v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul && set "MV_TARGET=%%t"
  )
)
if not defined MV_TARGET (
  echo %MV_W%No release found on GitHub: starting the version you have.%MV_0%
  goto deps
)
set "MV_LABEL=release %MV_TARGET%"
goto compare

:pick_branch
if defined MV_PICK goto pick_named
rem the newest work branch (each Claude session makes its own), not upstream ones
for /f "delims=" %%b in ('git for-each-ref "--sort=-committerdate" "--format=%%(refname:lstrip=3)" refs/remotes/origin/claude/') do (
  if not defined MV_BRANCH (
    echo %%b| findstr /b /c:"claude/upstream-" >nul || set "MV_BRANCH=%%b"
  )
)
if not defined MV_BRANCH (
  echo %MV_W%No work branch found on GitHub: starting the version you have.%MV_0%
  goto deps
)
goto branch_target

:pick_named
set "MV_BRANCH=%MV_PICK%"
if /i not "%MV_BRANCH:~0,7%"=="claude/" set "MV_BRANCH=claude/%MV_BRANCH%"
git rev-parse --verify --quiet "origin/%MV_BRANCH%" >nul
if errorlevel 1 goto pick_missing
goto branch_target
:pick_missing
echo %MV_W%No branch %MV_BRANCH% on GitHub: starting the version you have.%MV_0%
goto deps

:branch_target
set "MV_TARGET=origin/%MV_BRANCH%"
set "MV_LABEL=branch %MV_BRANCH%"

:compare
set "MV_HEAD="
set "MV_WANT="
for /f "delims=" %%h in ('git rev-parse HEAD') do set "MV_HEAD=%%h"
for /f "delims=" %%h in ('git rev-parse --verify --quiet "%MV_TARGET%^{commit}"') do set "MV_WANT=%%h"
if "%MV_HEAD%"=="%MV_WANT%" (
  echo %MV_G%Up to date: %MV_LABEL%.%MV_0%
  goto deps
)
call :version MV_NOW
set "MV_ON="
for /f "delims=" %%b in ('git symbolic-ref --quiet --short HEAD 2^>nul') do set "MV_ON=%%b"
if defined MV_ON echo You are on branch %MV_ON% ^(Molfar Vertep %MV_NOW%^).
if not defined MV_ON echo %MV_G%Installed: Molfar Vertep %MV_NOW%.%MV_0%
rem picked in the menu: asking again would only slow it down
if defined MV_TAKE goto checkout
call :ask "Update to %MV_LABEL%"
if errorlevel 2 (
  echo %MV_W%Keeping the version you have.%MV_0%
  goto deps
)
:checkout
echo %MV_H%=== Switching to %MV_LABEL%...%MV_0%
rem bun install rewrites the lock files; they are not ours to keep
git checkout -- bun.lock client-agent/bun.lock 2>nul
rem a launcher copied into the folder by hand would block a version that
rem ships its own: git refuses to overwrite an untracked file
git ls-files --error-unmatch Molfar-Vertep.bat >nul 2>nul
if errorlevel 1 git cat-file -e "%MV_TARGET%:Molfar-Vertep.bat" 2>nul && del /q "Molfar-Vertep.bat" 2>nul
if defined MV_DEV (
  rem a branch held by a git worktree, a Claude Code session on this
  rem computer, cannot be checked out twice: take its commit instead
  git checkout -B "%MV_BRANCH%" "origin/%MV_BRANCH%" 2>nul || git checkout --quiet --detach "%MV_TARGET%"
) else (
  git checkout --quiet --detach "%MV_TARGET%"
)
if errorlevel 1 goto fail
rem a version without this launcher keeps it, so the desktop shortcut still works
if not exist "Molfar-Vertep.bat" copy /y "%MV_RUNNING%" "Molfar-Vertep.bat" >nul 2>nul
set "MV_FULL=1"
goto deps

rem ---------- back to the previous release ----------
rem The release tag before the one checked out (or, on a work branch, the
rem newest release). The engine first checks the data: the account files
rem saved at the last change of version go back only when the newer version
rem stored them in a way the older one cannot read (chrysalis rollback).
:previous
git diff --quiet HEAD -- . ":(exclude)bun.lock" ":(exclude)client-agent/bun.lock"
if errorlevel 1 (
  echo %MV_W%Molfar Vertep's own files have local changes, so it cannot switch versions.%MV_0%
  echo %MV_W%"git status" in the app folder shows them.%MV_0%
  goto fail
)
set "MV_AT="
for /f "delims=" %%t in ('git tag -l "v*" --points-at HEAD') do (
  echo %%t| findstr /r /x "v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul && set "MV_AT=%%t"
)
set "MV_TARGET="
set "MV_SEEN="
if not defined MV_AT set "MV_SEEN=1"
for /f "delims=" %%t in ('git tag -l "v*" --sort^=-v:refname') do (
  if not defined MV_TARGET (
    echo %%t| findstr /r /x "v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul && (
      if defined MV_SEEN (set "MV_TARGET=%%t") else if "%%t"=="%MV_AT%" set "MV_SEEN=1"
    )
  )
)
if not defined MV_TARGET (
  echo %MV_W%No earlier release found: starting the version you have.%MV_0%
  goto deps
)
call :version MV_NOW
echo %MV_G%Installed: Molfar Vertep %MV_NOW%.%MV_0%
call :ask "Go back to release %MV_TARGET%"
if errorlevel 2 (
  echo %MV_W%Keeping the version you have.%MV_0%
  goto deps
)
set "MV_LABEL=release %MV_TARGET%"
set "MV_STAY=1"
rem versions before 1.2.2 have no rollback step: their data needs none
if not exist "src\rollback.ts" goto checkout
echo %MV_H%=== Checking your data for %MV_TARGET%...%MV_0%
call bun run src/index.ts rollback %MV_TARGET:~1%
if errorlevel 1 goto fail
goto checkout

rem ---------- check the files (C in the menu) ----------
rem What a start needs, without changing anything: the engine's own files as
rem git has them, the packages, the built interface, the tools. Back to the
rem menu afterwards, which then waits for a key.
:check
echo.
echo %MV_H%=== Checking the files...%MV_0%
set "MV_NEED_R="
set "MV_NEED_GIT="
for /f "delims=" %%v in ('git --version 2^>nul') do echo   %%v
echo   bun version %MV_BUNV%
set "MV_ST=%TEMP%\molfar-vertep-status-%RANDOM%.txt"
git status --porcelain --untracked-files=normal -- . ":(exclude)bun.lock" ":(exclude)client-agent/bun.lock" >"%MV_ST%" 2>nul
set "MV_STSIZE=0"
for %%A in ("%MV_ST%") do set "MV_STSIZE=%%~zA"
if "%MV_STSIZE%"=="0" echo %MV_G%  Engine files: as released, no local changes.%MV_0%
if not "%MV_STSIZE%"=="0" set "MV_NEED_GIT=1"
if defined MV_NEED_GIT echo   Engine files with local changes. Updates skip them until they are undone:
if defined MV_NEED_GIT type "%MV_ST%"
del /q "%MV_ST%" 2>nul
if exist "node_modules\" echo %MV_G%  Packages: installed.%MV_0%
if not exist "node_modules\" echo %MV_E%  Packages: MISSING.%MV_0%
if not exist "node_modules\" set "MV_NEED_R=1"
if exist "client-agent\node_modules\" echo %MV_G%  Agent page packages: installed.%MV_0%
if not exist "client-agent\node_modules\" echo %MV_E%  Agent page packages: MISSING.%MV_0%
if not exist "client-agent\node_modules\" set "MV_NEED_R=1"
if exist "client\dist\index.html" echo %MV_G%  Interface: built.%MV_0%
if not exist "client\dist\index.html" echo %MV_E%  Interface: NOT BUILT.%MV_0%
if not exist "client\dist\index.html" set "MV_NEED_R=1"
if exist "client-agent\dist\index.html" echo %MV_G%  Agent page: built.%MV_0%
if not exist "client-agent\dist\index.html" echo %MV_E%  Agent page: NOT BUILT.%MV_0%
if not exist "client-agent\dist\index.html" set "MV_NEED_R=1"
if exist "data\" echo %MV_G%  Your data folder: found.%MV_0%
if not exist "data\" echo   Your data folder: not created yet ^(the first start creates it^).
if defined MV_BUN_OLD echo %MV_W%  Bun is older than 1.4.0: "Molfar-Vertep.bat tools" updates it.%MV_0%
echo.
if defined MV_NEED_R echo   7 in the menu installs the packages and builds the interface.
if defined MV_NEED_GIT echo   "git status" in the app folder shows the changes; "git checkout -- ." undoes them.
if not defined MV_NEED_R if not defined MV_NEED_GIT echo %MV_G%  Everything is in place.%MV_0%
set "MV_MENU_WAIT=0"
goto menu

rem ---------- install and build only what is needed ----------
:deps
if defined MV_FULL goto install
if not exist "node_modules" goto install
if not exist "client-agent\node_modules" goto install
goto build

:install
echo %MV_H%=== Installing packages...%MV_0%
call bun install
if errorlevel 1 goto fail
pushd client-agent
call bun install
if errorlevel 1 (
  popd
  goto fail
)
popd
git checkout -- bun.lock client-agent/bun.lock 2>nul

:build
if defined MV_FULL goto dobuild
if not exist "client\dist\index.html" goto dobuild
if not exist "client-agent\dist\index.html" goto dobuild
goto shortcut

:dobuild
echo %MV_H%=== Building the interface...%MV_0%
call bun run build:client
if errorlevel 1 goto fail

rem ---------- desktop shortcut ----------
:shortcut
if defined MV_SHORTCUT goto make_shortcut
if exist "%MV_STATE%\shortcut-asked" goto run
call :ask "Put a Molfar Vertep shortcut on your desktop"
set "MV_NO_SC=%errorlevel%"
>"%MV_STATE%\shortcut-asked" echo asked
if "%MV_NO_SC%"=="2" goto run

:make_shortcut
rem the shortcut opens the launcher inside the app folder, never a stray copy
set "MV_LNK=%MV_SELF%"
if exist "%APP%\Molfar-Vertep.bat" set "MV_LNK=%APP%\Molfar-Vertep.bat"
set "MV_PNG=%APP%\client\public\icon-512.png"
set "MV_ICO=%MV_STATE%\molfar-vertep.ico"
rem the icon: the logo as a 256 px PNG inside a one-image .ico
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { Add-Type -AssemblyName System.Drawing; $b = New-Object System.Drawing.Bitmap $env:MV_PNG; $r = New-Object System.Drawing.Bitmap $b, 256, 256; $m = New-Object System.IO.MemoryStream; $r.Save($m, [System.Drawing.Imaging.ImageFormat]::Png); $p = $m.ToArray(); $h = [byte[]](0,0,1,0,1,0,0,0,0,0,1,0,32,0) + [BitConverter]::GetBytes([int]$p.Length) + [BitConverter]::GetBytes([int]22); [System.IO.File]::WriteAllBytes($env:MV_ICO, [byte[]]($h + $p)) } catch {}; " ^
  "try { $d = [Environment]::GetFolderPath('Desktop'); $l = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Molfar Vertep.lnk')); $l.TargetPath = $env:MV_LNK; $l.WorkingDirectory = $env:APP; $l.Description = 'Start Molfar Vertep'; if (Test-Path $env:MV_ICO) { $l.IconLocation = $env:MV_ICO }; $l.Save() } catch { exit 1 }"
if errorlevel 1 (
  echo Could not create the desktop shortcut. You can still start Molfar Vertep with this file.
) else (
  echo %MV_G%Desktop shortcut: Molfar Vertep.%MV_0%
)

rem ---------- start ----------
:run
call :version MV_NOW
echo %MV_S%=== Starting Molfar Vertep %MV_NOW%. Your browser opens by itself.%MV_0%
echo %MV_D%    Keep this window open while you use it; close it or press Ctrl+C to stop.%MV_0%
echo %MV_D%    First start: the link with #setup= creates your account.%MV_0%
rem tells the engine its launcher started it, so it opens the browser
set "CHRYSALIS_LAUNCHER=1"
if defined MV_STAY echo %MV_D%    To stay on this version, start with "Molfar-Vertep.bat nopull": a plain start offers the newest release again.%MV_0%
call bun start
set "MV_EXIT=%errorlevel%"
echo.
echo Molfar Vertep stopped.
if not "%MV_EXIT%"=="0" echo %MV_W%If it fails like this since an update, "Molfar-Vertep.bat previous" goes back to the release before.%MV_0%
pause
goto done

:declined
echo %MV_W%Nothing was downloaded.%MV_0%
pause
goto done

:fail
echo.
echo %MV_E%Something went wrong: see the messages above.%MV_0%
pause
set "MV_RC=1"
goto done

rem ---------- helpers ----------
rem :ask "question"  ->  errorlevel 1 = yes, 2 = no. Yes after 20 seconds
rem without an answer, and always with the "yes" option.
:ask
if defined MV_YES exit /b 1
choice /c YN /t 20 /d Y /m "%~1"
exit /b %errorlevel%

rem :git_trust  ->  errorlevel 0 when git works in the current folder. Git refuses
rem a folder another Windows user owns ("dubious ownership": a second drive, a USB
rem stick, a folder made as administrator). Trusting this one folder is offered,
rem never every folder. No paths inside ( ) blocks: one with ")" would end the block.
:git_trust
set "MV_GITERR=%TEMP%\molfar-vertep-git-%RANDOM%.txt"
git rev-parse --git-dir >nul 2>"%MV_GITERR%"
if errorlevel 1 goto git_refused
del /q "%MV_GITERR%" 2>nul
exit /b 0
:git_refused
findstr /i /c:"safe.directory" "%MV_GITERR%" >nul
if not errorlevel 1 goto git_untrusted
type "%MV_GITERR%"
del /q "%MV_GITERR%" 2>nul
echo %MV_E%Git cannot read the Molfar Vertep folder:%MV_0%
echo %MV_D%  %CD%%MV_0%
exit /b 1
:git_untrusted
del /q "%MV_GITERR%" 2>nul
echo.
echo %MV_W%Git does not trust this folder, because another Windows user owns it%MV_0%
echo %MV_W%^(common on a second drive, a USB stick or a folder made as administrator^):%MV_0%
echo %MV_D%  %CD%%MV_0%
echo Molfar Vertep can tell Git to trust this one folder.
call :ask "Trust this folder"
if errorlevel 2 goto git_trust_declined
git config --global --add safe.directory "%CD:\=/%"
git rev-parse --git-dir >nul 2>nul
if errorlevel 1 goto git_trust_failed
echo %MV_G%Git trusts the folder now.%MV_0%
exit /b 0
:git_trust_declined
echo %MV_W%Nothing was changed. To trust the folder yourself, run:%MV_0%
echo %MV_K%  git config --global --add safe.directory "%CD:\=/%"%MV_0%
echo then start this file again.
exit /b 1
:git_trust_failed
echo %MV_E%Git still refuses the folder. Run this yourself, then start this file again:%MV_0%
echo %MV_K%  git config --global --add safe.directory "%CD:\=/%"%MV_0%
exit /b 1

rem :version VAR  ->  the version in package.json
:logo
rem The star and the name in colour (scripts\logo.ans, UTF-8 with colour codes).
rem Only in a console at least 101 columns wide; the plain menu otherwise.
rem Colour codes need Windows 10, which Bun needs anyway. This file stays
rem ASCII: the logo is typed under code page 65001, and the console's own
rem code page comes back right after.
if not exist "%APP%\scripts\logo.ans" exit /b 1
set "MV_COLS=0"
set "MV_N=0"
for /f "tokens=2 delims=:" %%a in ('mode con 2^>nul ^| findstr /r /c:"[0-9][0-9]*$"') do call :logo_cols %%a
if %MV_COLS% LSS 101 exit /b 1
if not defined ESC exit /b 1
set "MV_CP="
for /f "tokens=2 delims=:" %%c in ('chcp') do set "MV_CP=%%c"
if defined MV_CP set "MV_CP=%MV_CP: =%"
if defined MV_CP set "MV_CP=%MV_CP:.=%"
chcp 65001 >nul
echo.
type "%APP%\scripts\logo.ans"
if defined MV_CP chcp %MV_CP% >nul
exit /b 0

:logo_cols
rem "mode con" lists Lines, then Columns (in any language): the second number
set /a MV_N+=1
if %MV_N%==2 set /a "MV_COLS=%~1" 2>nul
exit /b 0

:version
set "%~1=?"
for /f "tokens=2 delims=:, " %%v in ('findstr /c:"\"version\"" package.json 2^>nul') do set "%~1=%%~v"
exit /b 0

:done
rem the temporary copy removes itself on the way out
if /i not "%MV_RUNNING%"=="%MV_SELF%" (goto) 2>nul & del "%MV_RUNNING%"
exit /b %MV_RC%
