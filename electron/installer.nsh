!macro customInit
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM Omnisize.exe /T 2>nul || exit 0"'
  Sleep 1000
!macroend

!macro customUnInit
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM Omnisize.exe /T 2>nul || exit 0"'
  Sleep 1000
!macroend

!macro customCheckAppRunning
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM Omnisize.exe /T 2>nul || exit 0"'
  Sleep 1000
!macroend

!macro customUnInstallCheckAppRunning
  nsExec::Exec 'cmd.exe /c "taskkill /F /IM Omnisize.exe /T 2>nul || exit 0"'
  Sleep 1000
!macroend
