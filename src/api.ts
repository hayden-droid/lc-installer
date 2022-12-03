import { RequestInfo, RequestInit, Headers, Request, default as truefetch } from "node-fetch";
import { installerVersion } from "./installer";

export const fetch: typeof import("node-fetch").default = Object.assign(function(url:RequestInfo, init?:RequestInit){
    if(typeof url === "string" || "href" in url){
        if(!init)init = {}
        if(init.headers){
            if(init.headers instanceof Headers){
                if(!init.headers.has("User-Agent"))init.headers.set("User-Agent", "MemeitizerCordInstaller/"+installerVersion)
            }else if(Array.isArray(init.headers)){
                if(!init.headers.find(e => e[0] === "User-Agent"))init.headers.push(["User-Agent", "MemeitizerCordInstaller/"+installerVersion])
            }else{
                init.headers["User-Agent"] = "MemeitizerCordInstaller/"+installerVersion
            }
        }else{  
            init.headers = {
                "User-Agent": "MemeitizerCordInstaller/"+installerVersion
            }
        }
    }else{
        if(url instanceof Request){
            if(!url.headers.has("User-Agent"))url.headers.set("User-Agent", "MemeitizerCordInstaller/"+installerVersion)
        }
    }
    return truefetch(url, init)
}, require("node-fetch").default) as typeof import("node-fetch").default