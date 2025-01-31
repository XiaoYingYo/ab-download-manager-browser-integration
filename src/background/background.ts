import {initializeOptions,resetOptions,setContextLnk} from "~/contextmenus/ContextMenus";
import * as backend from "~/backend/Backend"
import {run} from "~/utils/ScopeFunctions";
import {redirectDownloadLinksToMe} from "~/linkgrabber/LinkGrabber";
import * as Configs from "~/configs/Config";
import {onMessage} from "webext-bridge/background";
import {addDownload, getHeadersForUrls} from "~/background/actions";
import {Disposable} from "~/utils/disposable";
import {keepListeningToEvents} from "~/utils/extension-api";
import {IS_MV3} from "~/utils/ManifestUtil";

function receiveMessageFromContentScripts() {
    onMessage("add_download",async (msg)=>{
        return await addDownload(msg.data)
    })
    onMessage("test_port",async (msg)=>{
        return await backend.ping(msg.data)
    })
    onMessage("show_log",(msg)=>{
        console.log(...msg.data)
    })
    onMessage("get_headers",async (msg)=>{
        return await getHeadersForUrls(msg.data)
    })
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
    onMessage("set_context_menu_link", (msg) => {
        if (msg.data == null || typeof msg.data !== "string") {
            msg.data = "";
        }
        setContextLnk(msg.data)
    })
    onMessage("reset_options", () => {
        resetOptions()
    })
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
}

run(async () => {
    const disposable= new Disposable()
    try {
        if (IS_MV3){
            disposable.add(keepListeningToEvents())
        }
        await Configs.boot()
        await initializeOptions()
        redirectDownloadLinksToMe()
        receiveMessageFromContentScripts()
        console.log("ab dm extension loaded successfully")
    } catch (e) {
        console.log("extension loading fail", e)
        // dispose resources if we can't serve the user well
        disposable.dispose()
    }
})
