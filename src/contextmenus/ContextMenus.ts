import browser from "webextension-polyfill";
import * as  Configs from "~/configs/Config"
import {DownloadRequestItem,DownloadRequestHeaders} from "~/interfaces/DownloadRequestItem";
import {sendMessage} from "webext-bridge/background"
import { addDownload, getHeadersForUrl } from "~/background/actions";

const optionIds = Object.freeze({
    downloadWithAbDm: "download-with-ab-dm",
    downloadSelectedWithAbDm: "download-selected-with-ab-dm",
})

// The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
let option = {
    contextLink: ""
}
// The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.

async function createOptions() {
    await browser.contextMenus.removeAll()
    browser.contextMenus.create({
        id: optionIds.downloadSelectedWithAbDm,
        title: browser.i18n.getMessage("context_menu_download_selected_links_with_abdm"),
        contexts: [
            "selection"
        ]
    })
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
    if (!Configs.getLatestConfig().forcedTryCaptureEnabled) {
        browser.contextMenus.create({
            id: optionIds.downloadWithAbDm,
            title: browser.i18n.getMessage("context_menu_download_with_abdm"),
            contexts: [
                "link", "audio", "video", "image"
            ]
        })
    } else {
        browser.contextMenus.create({
            id: optionIds.downloadWithAbDm,
            title: browser.i18n.getMessage("context_menu_download_with_abdm"),
            contexts: [
               "all"
            ]
        })
    }
    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
}

function createOnCLickHandlers() {
    browser.contextMenus.onClicked.addListener(async (args) => {
        switch (args.menuItemId) {
            case optionIds.downloadWithAbDm:
                let link = args.linkUrl || args.srcUrl
                if (!link) {
                    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
                    if (!Configs.getLatestConfig().forcedTryCaptureEnabled || option.contextLink == "") {
                        console.log("there is no valid link returning")
                        return
                    }
                    link = option.contextLink
                    // The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
                }
                const downloadPage = args.pageUrl ?? null
                const description = args.linkText ?? null
                let headers: DownloadRequestHeaders | null = null
                if (Configs.getLatestConfig().sendHeaders) {
                    headers = await getHeadersForUrl(link)
                }
                const downloadRequest: DownloadRequestItem = {
                    link: link,
                    description: description,
                    downloadPage: downloadPage,
                    headers: headers,
                }
                await addDownload([downloadRequest])
                // backgroundReceiveMessage(addDownloadCommand([downloadRequest]))
                break
            case optionIds.downloadSelectedWithAbDm:
                const [tab] = (await browser.tabs.query({active: true}))
                const tabId = tab?.id
                if (tabId === undefined) {
                    break
                }
                await sendMessage(
                    "check_selected_text_for_links",
                    null,
                    {
                        tabId:tabId,
                        context:"content-script",
                    }
                )
                break
        }

    })
}

export async function initializeOptions() {
    await createOptions()
    createOnCLickHandlers()
}

// The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.
export async function resetOptions() {
    createOptions()
}

export function setContextLnk(link: string) {
    option.contextLink = link
}
// The code only ensures that the function can be realized, not the appearance and standardization. Please forgive me or modify it by yourself.