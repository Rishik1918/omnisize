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

!macro customInstall
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\image\shell\OmnisizeConvert" "" "Convert to PDF using Omnisize"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\image\shell\OmnisizeConvert" "Icon" "$INSTDIR\Omnisize.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\image\shell\OmnisizeConvert\command" "" '"$INSTDIR\Omnisize.exe" --convert-images "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\image\shell\OmnisizeConvert"
!macroend
