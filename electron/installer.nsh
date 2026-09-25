!macro customCheckAppRunning
  nsExec::Exec 'taskkill /F /IM Omnisize.exe /T'
  Sleep 1000
!macroend

!macro customUnInstallCheckAppRunning
  nsExec::Exec 'taskkill /F /IM Omnisize.exe /T'
  Sleep 1000
!macroend
