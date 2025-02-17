import * as fs from "fs"
import Logger from "../Logger"
import { downloadPath, getLatestReleaseInfos, downloadFileToFile, getAsset, unzipFile, Release } from "../installer"
import * as path from "path"
import { join } from "path"
import * as spawn from "cross-spawn"
import { pressAnyKeyToContinue } from "../pressKey"
import { exec } from "child_process"
import { Menu, defaultItems } from "../menus/Menu"
import { homedir } from "os"
import getAppDataPath from "appdata-path"

const win32Logger = new Logger("win32")

export async function start(isMain:boolean){ // detect if npx/npm was used or not
    /*if(isMain && process.argv.length === 2){ // directly install
        await download()
        // await for a key or exit after a 10s timeout
        setTimeout(() => {
            process.exit()
        }, 10000);
        await pressAnyKeyToContinue()
        process.exit()
    }else{*/
    // Ask users questions
    console.clear()
    const memeitizercordInstallPath = join(process.env.LOCALAPPDATA, "MemeitizerCord")
    const isInstalled = fs.existsSync(memeitizercordInstallPath)
    const options:any = [
        {
            id: "install",
            label: isInstalled ? "Reinstall MemeitizerCord" : "Install MemeitizerCord",
            async onClick(){
                menu.disable()

                await download()

                // await for a key or exit after a 10s timeout
                setTimeout(() => {
                    process.exit()
                }, 10000);
                await pressAnyKeyToContinue()
                process.exit()
            }
        }
    ]
    if(isInstalled){
        options.push({
            id: "uninstall",
            label: "Uninstall MemeitizerCord",
            async onClick(){
                menu.disable()

                await uninstall()
                setTimeout(() => {
                    process.exit()
                }, 10000);
                await pressAnyKeyToContinue()
                process.exit()
            }
        })
    }
    options.push(...defaultItems)
    let menu = new Menu({
        options: options,
        selected: "install"
    })
    menu.render()
    //}
}

export async function uninstall(){
    win32Logger.log("Killing instances of MemeitizerCord")
    await killMemeitizerCord()

    const memeitizercordInstallPath = join(process.env.LOCALAPPDATA, "MemeitizerCord")
    if(!fs.existsSync(memeitizercordInstallPath)){
        console.error("MemeitizerCord isn't installed.")
        process.exit(1)
    }

    win32Logger.log(`Deleting ${memeitizercordInstallPath}`)
    await fs.promises.rmdir(memeitizercordInstallPath, {recursive: true})

    const desktopShortcut = join(homedir(), "Desktop", "MemeitizerCord.lnk")
    if(fs.existsSync(desktopShortcut)){
        win32Logger.log(`Deleting desktop shortcut`)
        await fs.promises.unlink(desktopShortcut)
    }

    const startMenuShortcut = join(
        getAppDataPath(),
        "Microsoft",
        "Windows",
        "Start Menu",
        "Programs",
        "MemeitizerCord.lnk"
    )
    if(fs.existsSync(startMenuShortcut)){
        win32Logger.log(`Deleting start menu shortcut`)
        await fs.promises.unlink(startMenuShortcut)
    }
}

export async function download(){
    win32Logger.log("Killing instances of MemeitizerCord")
    await killMemeitizerCord()

    win32Logger.log("Downloading MemeitizerCord to "+downloadPath)
    // DEV BUILD FORCE
    let release = process.env.isDev ? {
        tag_name: "Dev",
        html_url: "https://github.com/MemeitizerCord/MemeitizerCord",
        assets: [{
            name: "memeitizercord-win32-ia32.zip",
            // Unknown Size
            // 137 mb
            size: 137.4*10**6,
            browser_download_url: "https://memeitizercord.org/api/v1/gh/releases/MemeitizerCord/MemeitizerCord/dev/memeitizercord-win32-ia32.zip"
        }] as Release["assets"]
    } : await getLatestReleaseInfos()
    
    win32Logger.log(`Downloading release ${release.tag_name} (${release.html_url})`)
    let asset = await getAsset(release.assets)

    await fs.promises.mkdir(path.dirname(downloadPath), {recursive: true})

    await downloadFileToFile(asset.browser_download_url, downloadPath)

    win32Logger.log(`Unzipping...`)
    let folderPath = await unzipFile(downloadPath)
    await fs.promises.unlink(downloadPath)

    win32Logger.log(`\x1b[32mFinished unzipping\x1b[0m. Moving \x1b[31mMemeitizerCord\x1b[0m and cleaning stuff`)
    if(folderPath.toLowerCase().includes("appdata\\roaming")){
        if(fs.existsSync(join(folderPath, "..", "..", "..", "Local", "MemeitizerCord"))){
            win32Logger.info(`Deleting actual MemeitizerCord.`)
            await fs.promises.rmdir(join(folderPath, "..", "..", "..", "Local", "MemeitizerCord"), {recursive: true})
            await new Promise(e=>setImmediate(e))
        }
        await fs.promises.rename(folderPath, join(folderPath, "..", "..", "..", "Local", "MemeitizerCord"))
        folderPath = join(folderPath, "..", "..", "..", "Local", "MemeitizerCord")
    }

    win32Logger.log(`\x1b[32mFinished moving, launching...\x1b[0m`)
    let exePath = path.join(folderPath, "MemeitizerCord.exe")

    await new Promise<void>((resolve, reject) => {
        let child = spawn.spawn(exePath, ["--after-install", "--should-create-shortcut"].filter(e => !!e), {
            detached: true
        })
        child.on("error", (err) => {
            reject(err)
        })
        resolve()
    })
    win32Logger.log(`\x1b[31mMemeitizerCord\x1b[0m is \x1b[32mnow installed\x1b[0m !`)
}

export function killMemeitizerCord(){
    return Promise.all([new Promise<void>(resolve => {
        exec("taskkill /im MemeitizerCord.exe /t /F", () => resolve())
    }), new Promise<void>(resolve => {
        // for some reasons, uppercase matters ?
        exec("taskkill /im memeitizercord.exe /t /F", () => resolve())
    })])
}