import {getLinksFromSelection} from "~/utils/LinkExtractor";
import * as selectionPopup from "~/popup/selection/SelectionPopup";
import {debounce} from "~/utils/Debaunce";
import * as mousePosition from "~/utils/MouseUtil"
import * as Configs from "~/configs/Config"
import {run} from "~/utils/ScopeFunctions";
import {DownloadRequestItem} from "~/interfaces/DownloadRequestItem";
import {onMessage,sendMessage} from "webext-bridge/content-script"
import browser from "webextension-polyfill";
import Constants from "~/utils/Constants";
import {createAlertStringForMyExtension} from "~/utils/AlertMessageCreator";
const showPopupDelayed = debounce(500)

async function checkAndReportLinks() {
    const selection = window.getSelection();
    if (selection == null) {
        alert(createAlertStringForMyExtension(browser.i18n.getMessage("popup_alert_nothing_selected")))
        return
    }
    let downloadItems = getLinksFromSelection(selection)
    if (downloadItems.length == 0) {
        alert(createAlertStringForMyExtension(browser.i18n.getMessage("popup_alert_no_link_detected")))
        return
    }
    if (Configs.getLatestConfig().sendHeaders) {
        const headersOfLinks = await sendMessage("get_headers",downloadItems.map(i=>i.link))
        downloadItems = downloadItems.map((value, index) => {
            return {
                ...value,
                headers: headersOfLinks[index],
            } as DownloadRequestItem
        })
    }
    await sendMessage("add_download",downloadItems,"background")
}

let lastSelectionConsumed = true

function shouldCreatePopup() {
    return lastSelectionConsumed && Configs.getLatestConfig().popupEnabled
}

run(async () => {
    await Configs.boot()
    mousePosition.boot()
    selectionPopup.setOnPopupClicked(async () => {
        checkAndReportLinks()
    })
    document.addEventListener("selectionchange", () => {
        lastSelectionConsumed = true
    })
    document.addEventListener("mouseup", () => {
        showPopupDelayed(() => {
            const mousePositionInPage = mousePosition.getMousePositionInPage();
            if (!shouldCreatePopup() || mousePositionInPage === null) {
                return;
            }
            const selection = window.getSelection();
            if (selection == null) {
                return;
            }
            if (selection.type !== "Range"){
                return;
            }
            const linksFromSelection = getLinksFromSelection(selection);
            if (linksFromSelection.length == 0) {
                return
            }
            lastSelectionConsumed = false
            selectionPopup.showAddDownloadPopupUi(mousePositionInPage)
        })
    })
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
    document.addEventListener('contextmenu', function (e) {
        let target = e.target as HTMLElement
        let text = target.innerText
        if (text == null || text.length == 0) {
            return
        }
        let uri:any = '';
        try {
            uri = new URL(text)
        } catch (e) { }
        sendMessage( "set_context_menu_link", uri, "background" )
    }, true);
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
    onMessage("show_log",(msg)=>{
        console.log(...msg.data)
    })
    onMessage("show_alert",(msg)=>{
        alert(createAlertStringForMyExtension(msg.data))
    })
    onMessage("check_selected_text_for_links",(msg)=>{
        checkAndReportLinks()
    })
}).catch(e => {
    console.log("failed to load ab-dm-extension", e)
})



