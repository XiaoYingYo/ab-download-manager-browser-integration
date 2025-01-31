import React, {ReactNode, useEffect, useMemo, useState} from "react";
import ReactDom from "react-dom";
import "~/assets/css/styles.css"
import {EventAwareViewModel, useViewModel} from "~/base/BaseViewModel";
import {makeObservable, observable} from "mobx";
import {observer} from "mobx-react-lite"
import {run} from "~/utils/ScopeFunctions";
import * as Configs from "~/configs/Config";
import {constraintIn} from "~/utils/NumberUtils";
import {AppIcon, SettingsIcon} from "~/components/ReactIcons";
import {sendMessage} from "webext-bridge/options"
import {Config, configKeys, defaultConfig} from "~/configs/Config";
import Multiselect from "~/optionsui/Multiselect";
import {arrayEquals} from "~/utils/ArrayUtils";
import browser from "webextension-polyfill";
import Constants from "~/utils/Constants";

class ToolsViewModelEvent {
}

class PortTestResult extends ToolsViewModelEvent {
    constructor(
        public port: number,
        public isSuccess: boolean,
        public message: string | null = null
    ) {
        super();
    }
}

class ToolsViewModel extends EventAwareViewModel<ToolsViewModelEvent> implements Configs.Config {
    constructor(initialStates: Configs.Config) {
        super();
        makeObservable(this)
        configKeys.forEach((k) => {
            this.setConfigItem(k, initialStates[k])
        })
    }

    private setConfigItem<K extends keyof Config>(key: K, value: Config[K]) {
        (this as Config)[key] = value
    }

    protected setUp() {
        Configs.onChanged.addEventListener((config) => {
            configKeys.forEach((k) => {
                this.setConfigItem(k, config[k])
            })
        })
    }

    @observable
    popupEnabled!: boolean
    @observable
    forcedTryCaptureEnabled!: boolean
    @observable
    autoCaptureLinks!: boolean
    @observable
    port!: number
    @observable
    sendHeaders!: boolean

    @observable
    registeredFileTypes!: string[]

    @observable
    allowPassDownloadIfAppNotRespond!: boolean

    @observable
    closeNewTabIfItWasCaptured!: boolean

    setAutoCaptureLinks(value: boolean) {
        Configs.setConfigItem("autoCaptureLinks", value)
    }

    setRegisteredFileTypes(types: string[]) {
        Configs.setConfigItem("registeredFileTypes", [...new Set(types)])
    }

    setPopupEnabled(value: boolean) {
        Configs.setConfigItem("popupEnabled", value)
    }
    
    async setForcedTryCaptureEnabled(value: boolean) {
       await Configs.setConfigItem("forcedTryCaptureEnabled", value)
       await sendMessage( "reset_options", null, "background" )
    }

    setPort(value: number) {
        Configs.setConfigItem("port", value)
    }

    setSendHeaders(value: boolean) {
        Configs.setConfigItem("sendHeaders", value)
    }

    testPort() {
        run(async () => {
            const port = this.port
            const result = await sendMessage("test_port", port, "background")
            if (typeof result === "boolean") {
                this.onEvent(new PortTestResult(
                    port, result
                ))
            } else {
                console.log("there is no valid result for ping")
            }
        })
    }

}


const App: React.FC<{
    vm: ToolsViewModel
}> = observer((props) => {
    const vm = useViewModel(() => props.vm)
    useEffect(() => {
        const listener = (event: ToolsViewModelEvent) => {
            if (event instanceof PortTestResult) {
                let str = ""
                if (event.isSuccess) {
                    str += browser.i18n.getMessage(
                        "config_port_connection_success",
                        [`${event.port}`]
                    )
                } else {
                    str += browser.i18n.getMessage(
                        "config_port_connection_fail",
                        [`${event.port}`]
                    )
                    if (event.message) {
                        str += `\n${event.message}`
                    }
                }
                alert(str)
            }
        }
        vm.addEventListener(listener)
        return () => vm.removeEventListener(listener)
    });
    return <div data-theme="dark" className="w-96 m-auto">
        <Header/>
        <SettingsSection vm = {vm}/>
        <Footer/>
    </div>
})

function Header() {
    return <div className="p-4 flex flex-col justify-center items-center space-y-4">
        <AppIcon className="w-16 h-16"/>
        <span>{browser.i18n.getMessage("option_ui_title")}</span>
    </div>
}
function Footer() {
    return <div className="p-4 flex flex-col justify-center items-center space-y-4">
        <span className="">
            {browser.i18n.getMessage("note_about_app_must_be_installed_first")}
            {" "}<a target="_blank"
                    className="link link-primary"
                    href={Constants.downloadAppUrl}>
            {<span>{browser.i18n.getMessage("download_abdm_app")
            }</span>}
            </a>
        </span>
        <Divider/>
        <div>
            <span>❤️ | </span>
            <span>{browser.i18n.getMessage("support_by_rating")}</span>
        </div>
        <Divider/>
        <div className="flex flex-row flex-wrap space-x-4">
            <a target="_blank" className="link link-primary" href={Constants.website}>{browser.i18n.getMessage("project_website")}</a>
            <a target="_blank" className="link link-primary" href={Constants.repository}>{browser.i18n.getMessage("project_source_code")}</a>
        </div>
    </div>
}

const SettingsSection: React.FC<{ vm: ToolsViewModel }> = observer((props) => {
    const vm = props.vm
    return <div className="bg-base-200">
        <div className="p-4 flex flex-row flex-nowrap items-center space-x-4">
            <SettingsIcon className="w-8 h-8"/>
            <span>{browser.i18n.getMessage("settings")}</span>
        </div>

        <div className="p-4 bg-base-200 shadow">
            <AutoCaptureSection
                enabled={vm.autoCaptureLinks}
                toggle={(v) => vm.setAutoCaptureLinks(v)}
                fileTypes={vm.registeredFileTypes}
                defaultFileTypes={defaultConfig.registeredFileTypes}
                setFileTypes={types => vm.setRegisteredFileTypes(types)}
            />
            <Divider/>
            <ShowPopupSection enabled={vm.popupEnabled} toggle={(v) => vm.setPopupEnabled(v)}/>
            <Divider/>
            <PortSection
                port={vm.port}
                setPort={(p) => vm.setPort(p)}
                onRequestTestPort={() => vm.testPort()}
            />
            <Divider/>
            <SendCookiesSection enabled={vm.sendHeaders} toggle={(v) => vm.setSendHeaders(v)}/>
        </div>

        <div className="p-4 flex flex-row flex-nowrap items-center space-x-4">
            <SettingsIcon className="w-8 h-8"/>
            <span>{browser.i18n.getMessage("experimental_settings")}</span>
        </div>

        <div className="p-4 bg-base-200 shadow">
            {/* This option can solve the problem that some web pages cannot capture the download link Dom tag dynamically generated by js or the download behavior on the web page but the A tag is not standardized. */}
            {/* For example:<a class="pl-item-link listener-link-api" data-filename="ALI213-SENRAN.KAGURA.PBS.NOBIKINI-88587.rar" data-link="https://vod3429-aliyun04-vip-lixian.xunlei.com/download/" data-index="0" one-link-mark="yes">https://vod3429-aliyun04-vip-lixian.xunlei.com/download/</a> */}
            {/* Because the A tag like this actually controls the download behavior by Js. The Js function may use data-link to obtain the download link due to the needs of the website, but in fact the html content can already be captured by "ABDM" */}
            <ForcedTryCaptureSection enabled={vm.forcedTryCaptureEnabled} toggle={(v) => vm.setForcedTryCaptureEnabled(v)}/>
        </div>
    </div>
})
function Divider() {
    return <div className="w-full bg-base-content/20 h-px my-4"/>
}

function OptionItem(
    props: {
        title: ReactNode,
        toggle: ReactNode,
        description: ReactNode,
    }
) {
    return <div className="flex flex-col space-y-4">
        <div className="flex flex-row items-center">
            {props.title}
            <div className="flex-grow"></div>
            {props.toggle}
        </div>
        <div className="opacity-80">
            {props.description}
        </div>
    </div>
}

function ShowPopupSection(
    props: {
        enabled: boolean,
        toggle: (v: boolean) => void
    }
) {
    return <OptionItem
        title={
            <div>{browser.i18n.getMessage("config_show_popups")}</div>
        }
        toggle={
            <input checked={props.enabled} onChange={event => props.toggle(event.target.checked)} type="checkbox"
                   className="checkbox"/>
        }
        description={
            <div>{browser.i18n.getMessage("config_show_popups_description")}</div>
        }
    />
}

function ForcedTryCaptureSection(
    props: {
        enabled: boolean,
        toggle: (v: boolean) => void
    }
) {
    return <OptionItem
        title={
            <div>{browser.i18n.getMessage("config_forced_try_capture")}</div>
        }
        toggle={
            <input checked={props.enabled} onChange={event => props.toggle(event.target.checked)} type="checkbox"
                   className="checkbox"/>
        }
        description={
            <div>{browser.i18n.getMessage("config_forced_try_capture_description")}</div>
        }
    />
}

function AutoCaptureSection(
    props: {
        enabled: boolean,
        toggle: (v: boolean) => void,
        fileTypes: string[]
        setFileTypes: (fileTypes: string[]) => void,
        defaultFileTypes: string[],
    }
) {
    const canBeReset = useMemo(() => {
        return !arrayEquals(props.defaultFileTypes, props.fileTypes)
    }, [props.fileTypes])
    return <OptionItem
        title={
            <div>{browser.i18n.getMessage("config_auto_capture_links")}</div>
        }
        toggle={
            <input checked={props.enabled} onChange={event => props.toggle(event.target.checked)} type="checkbox"
                   className="checkbox"/>
        }
        description={
            <div className="flex flex-col">
                <div>{browser.i18n.getMessage("config_auto_capture_links_description")}</div>
                <div className="mt-2"/>
                <Multiselect
                    items={props.fileTypes}
                    setItems={props.setFileTypes}
                />
                {
                    canBeReset && (
                        <div
                            onClick={() => props.setFileTypes(props.defaultFileTypes)}
                            className="link">
                            {browser.i18n.getMessage("config_auto_capture_links_file_extensions_reset_to_default")}
                        </div>
                    )
                }
                <div className="mt-2"/>
                <div>{browser.i18n.getMessage("config_auto_capture_links_file_extensions_description")}</div>
            </div>
        }
    />
}

function PortSection(
    props: {
        port: number,
        setPort: (number: number) => void,
        onRequestTestPort: () => void,
    }
) {
    const [value, setValue] = useState(props.port)
    useEffect(() => {
        setValue(props.port)
    }, [props.port])

    function emitData() {
        const newPort = constraintIn(value, Configs.MIN_ALLOWED_PORT, Configs.MAX_ALLOWED_PORT)
        setValue(newPort)
        props.setPort(newPort)
    }

    return <OptionItem
        title={
            <div>{browser.i18n.getMessage("config_port")}</div>
        }
        toggle={
            <>
                <input
                    value={value}
                    onBlur={() => emitData()}
                    onChange={(event) => {
                        const v = event.target.value
                        const n = Number.parseInt(v)
                        if (Number.isNaN(n)) {
                            return
                        }
                        setValue(n)
                    }}
                    type="number" className="w-32 input"/>
                <button onClick={() => props.onRequestTestPort()} className="btn btn-primary normal-case">
                    {browser.i18n.getMessage("test")}
                </button>
            </>
        }
        description={
            <div>
                {browser.i18n.getMessage("config_port_description")}
            </div>
        }
    />
}

function SendCookiesSection(
    props: {
        enabled: boolean,
        toggle: (v: boolean) => void
    }
) {
    return <OptionItem
        title={
            <div>{browser.i18n.getMessage("config_send_cookies")}</div>
        }
        toggle={
            <input checked={props.enabled} onChange={e => props.toggle(e.target.checked)} type="checkbox"
                   className="checkbox"/>
        }
        description={
            <div>
                {browser.i18n.getMessage("config_send_cookies_descrption")}
            </div>
        }
    />
}

run(async () => {
    await Configs.boot()
    const vm = new ToolsViewModel(Configs.getLatestConfig())
    const container = document.getElementById("app")!
    ReactDom.render(
        <App vm={vm}/>,
        container,
    )
})
