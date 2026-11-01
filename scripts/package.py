"""Build the unpacked Chrome extension release using Python's standard library."""
from pathlib import Path
import hashlib
import json
import zipfile


def main():
    root = Path(__file__).resolve().parents[1]
    extension = root / "extension"
    manifest = json.loads((extension / "manifest.json").read_text(encoding="utf-8"))
    required = [manifest["action"]["default_popup"]]
    for script in manifest["content_scripts"]:
        required.extend(script.get("js", []))
        required.extend(script.get("css", []))
    for name in required:
        if not (extension / name).is_file():
            raise FileNotFoundError(name)

    output = root / "dist"
    output.mkdir(exist_ok=True)
    archive = output / f"MathGao-Zujuan-{manifest['version']}.zip"
    files = sorted(p for p in extension.rglob("*") if p.is_file())
    files.extend([root / "README.md", root / "安装说明.md"])
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in files:
            info = zipfile.ZipInfo(path.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            data = path.read_bytes()
            if path.suffix in {".js", ".css", ".html", ".json", ".md"}:
                data = data.replace(b"\r\n", b"\n")
            package.writestr(info, data)
    with zipfile.ZipFile(archive) as package:
        if package.testzip() is not None:
            raise RuntimeError("ZIP integrity check failed")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum = output / "SHA256SUMS.txt"
    checksum.write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
    print(archive.name)
    print(f"SHA-256: {digest}")


if __name__ == "__main__":
    main()
