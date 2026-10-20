; Older GD Toolkit versions pass --updated --force-run without /S.
; Enter silent mode before installer initialization so those updates also skip
; the wizard, including the Finish page. Manual first-time installs keep UI.
!macro preInit
  !ifndef BUILD_UNINSTALLER
    ${if} ${isUpdated}
      SetSilent silent
    ${endif}
  !endif
!macroend
