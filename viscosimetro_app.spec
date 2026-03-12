# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules


project_root = Path(SPECPATH).resolve()
frontend_dist = project_root / "ui-viscosimetro" / "dist"

if not frontend_dist.is_dir():
    raise FileNotFoundError(
        f"Frontend build no encontrado en: {frontend_dist}. Ejecuta primero el build de ui-viscosimetro."
    )

hiddenimports = (
    collect_submodules("serial")
    + collect_submodules("websockets")
    + ["bridge.serial_manager"]
)

datas = [
    (str(frontend_dist), "ui-viscosimetro/dist"),
]

a = Analysis(
    [str(project_root / "main.py")],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="viscosimetro_app",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="viscosimetro_app",
)
