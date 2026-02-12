# Publishing a New Version

This document outlines the procedure for releasing a new version of Notebook.

## Pre-Release Checklist

- [ ] All features for the release are complete and tested
- [ ] No critical bugs or errors in the console
- [ ] Code compiles without TypeScript errors
- [ ] Test the app manually (create notes, switch views, embeds work, etc.)

## Version Bump

1. **Update version in `notebook/package.json`:**
   ```json
   {
     "version": "X.Y.Z"
   }
   ```
   
   Follow [Semantic Versioning](https://semver.org/):
   - **MAJOR (X)**: Breaking changes or major rewrites
   - **MINOR (Y)**: New features, backward compatible
   - **PATCH (Z)**: Bug fixes, small improvements

## Build Commands

Navigate to the `notebook` directory:

```powershell
cd notebook
```

### Development Testing
```powershell
npm start
```

### Package (creates unpacked app)
```powershell
npm run package
```
Output: `notebook/out/Notebook-win32-x64/`

### Make Distributable Installers
```powershell
npm run make
```
Output: `notebook/out/make/`

This creates:
- **Windows**: `.exe` installer (Squirrel)
- **macOS**: `.zip` archive
- **Linux**: `.deb` and `.rpm` packages

## Platform-Specific Builds

The makers are configured in `forge.config.ts`:

| Platform | Maker | Output Format |
|----------|-------|---------------|
| Windows  | MakerSquirrel | `.exe` installer |
| macOS    | MakerZIP | `.zip` archive |
| Linux    | MakerDeb | `.deb` package |
| Linux    | MakerRpm | `.rpm` package |

## Publishing to GitHub Releases

1. **Create a Git tag:**
   ```powershell
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **Go to GitHub → Releases → Draft a new release**

3. **Select the tag** you just pushed

4. **Upload the artifacts** from `notebook/out/make/`:
   - `squirrel.windows/x64/Notebook-X.Y.Z Setup.exe`
   - Any other platform builds

5. **Write release notes** describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)

6. **Publish the release**

## Automated Publishing (Optional)

To enable automated publishing via Electron Forge:

```powershell
npm run publish
```

This requires configuring a publisher in `forge.config.ts`. See [Electron Forge Publishers](https://www.electronforge.io/config/publishers) for GitHub, S3, etc.

## Post-Release

- [ ] Verify the release appears on GitHub
- [ ] Download and test the installer on a clean machine
- [ ] Update any documentation or changelogs
- [ ] Announce the release if applicable

## Troubleshooting

### Build fails with TypeScript errors
```powershell
npx tsc --noEmit
```
Fix all type errors before building.

### Package size is too large
- Check if unnecessary files are included
- Verify `asar: true` is set in `forge.config.ts`

### Windows code signing
For production releases, configure code signing in `MakerSquirrel`:
```typescript
new MakerSquirrel({
  certificateFile: './cert.pfx',
  certificatePassword: process.env.CERTIFICATE_PASSWORD
})
```
