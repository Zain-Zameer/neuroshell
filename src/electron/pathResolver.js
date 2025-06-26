import { isDev } from "./util.js";
import path from "path"
import {app} from "electron"

export function getPreloadPath(){
    return isDev()
    ? path.join(app.getAppPath(), 'src/electron/preload.cjs')
    : path.join(app.getAppPath(), 'dist-electron/preload.cjs'); 
}