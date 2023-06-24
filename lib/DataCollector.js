import { accountCheck, accountRemove, checkUpdate } from "./extension.js";
import { getResult, trueFalse, listCheckbox } from "./prompt.js";
import { log } from "./console.js";
import { DataPath } from "../index.js";

import fs from "fs";
import path from "path";

var client = null, cache, conf;
var guildid, channelid, waynotify, webhookurl, usernotify, autocaptcha, apiuser, apikey, musicpath, gemorder, prefix;
var autodaily, autopray, autoquote, autoother, autogem, autosleep, autowait, autorefresh, autolootbox, autoslash;

function listDocument() {
    const document = 
`\x1b[1mTesekkurler:

    \x1b[2m- \x1b[1mAiko-chan-ai      \x1b[1m[\x1b[0mContributor - API Library Creator\x1b[1m]
    \x1b[2m- \x1b[1miamz4ri           \x1b[1m[\x1b[0mContributor\x1b[1m]
    \x1b[2m- \x1b[1mkeepmeside        \x1b[1m[\x1b[0mContributor\x1b[1m]

\x1b[1mTeşekkürler:
    \x1b[0m
    Ben Kiwinionana Ve Size Botumu Kullandiginiz İçin Çok Ama Çok Teşekkür Ediyorum Muck`
    const obj = listCheckbox("list", document, [
        {name: "Bağiş", value: 1},
        {name: "Geri", value: -1},
    ]);
    return obj;
}

function listAccount(data) {
    const obj = listCheckbox("list", "Giriş Yapmak İçin Hesap Seçin", [
        ...new Set(Object.values(data).map(user => user.tag)), 
        {name: "Yeni Hesap Kaydet (Token)", value: 0},
        {name: "Yeni Hesap Kaydet (QR Kod)", value: 1},
        {name: "Yeni Hesap Kaydet (MFA-önerilmez-)", value: 2},
        {name: "Hakkimizda", value: 3},
    ])
    obj.filter = (value) => {
        const user = Object.values(data).find(u => u.tag == value);
        if(user) return Buffer.from(user.token.split(".")[0], "base64").toString();
        else return value;
    }
    return obj;
};

function getToken() {
    return {
        type: "input",
        validate(token) {
            return token.split(".").length === 3 ? true : "Yanliş Token!";
        },
        message: "Tokeninizi Giriniz"
    };
}

function getAccount() {
    return [{
        type: "input",
        message: "Enter Your Email/Phone Number: ",
        validate(ans) {
            return ans.match(/^((\+?\d{1,2}\s?)?(\d{3}\s?\d{3}\s?\d{4}|\d{10}))|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/) ? true : "Invalid Email/Phone Number";
        }
    }, {
        type: "password",
        message: "Enter Your Password: ",
        validate(ans) {
            return ans.match(/^.+$/) ? true : "Invalid Input";
        }
    }, {
        type: "input",
        message: "Enter Your 2FA/Backup Code: ",
        validate: (ans) => {
            return ans.match(/^([0-9]{6}|[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4})$/) ? true : "Invalid 2FA/Backup Code"
        }
    }];

}

function listGuild(cache) {
    const obj = listCheckbox("list", "Botun Çalişacaği Sunucuyu Seçiniz", client.guilds.cache.map(guild => ({name: guild.name, value: guild.id})))
    if(cache && client.guilds.cache.get(cache)) obj.default = () => {
        const guild = client.guilds.cache.get(cache)
        return guild.id
    };
    return obj;
}

function listChannel(cache) {
    const guild = client.guilds.cache.get(guildid);
    const channelList = guild.channels.cache.filter(cnl => ["GUILD_NEWS", "GUILD_TEXT"].includes(cnl.type) && cnl.permissionsFor(guild.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"]))
    const obj = listCheckbox("checkbox", "Botun Çalışacağı Kanalı Seçiniz", [{name: "Sunucu Seçme Ekranına Geri Dön", value: -1}, ...channelList.map(ch => ({name: ch.name, value: ch.id}))])
    obj.validate = (ans) => {return ans.length > 0 ? true : "Lütfen En Az 1 Kanal Seçiniz" }
    if(cache && channelList.some(cn => cache.indexOf(cn.id) >= 0)) obj.default = [...channelList.filter(channel => cache.indexOf(channel.id) >= 0).map(channel => channel.id)];
    return obj;
}

function wayNotify(cache) {
    const obj = listCheckbox(
        "checkbox", 
        "Bot Doğrulamaya Düşünce Nasıl Bildirim Almak İstersiniz?", 
        [
            {name: "Müzik", value: 3},
            {name: "Webhook", value: 0}, 
            {name: "Direkt Mesaj DM", value: 1}, 
            {name: "Sesli Arama", value: 2}
        ]
    )
    if(cache) obj.default = cache;
    return obj;
}

function webhook(cache) {
    const obj = {
        type: "input",
        message: "Webhook Linkinizi Giriniz",
        validate(ans) {
            return ans.match(/(^.*(discord|discordapp)\.com\/api\/webhooks\/([\d]+)\/([a-zA-Z0-9_-]+)$)/gm) ? true : "Hatalı Webhook"
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function userNotify(cache){
    const obj = {
        type: "input",
        message: "Arama/Direkt Mesaj İçin IDnizi Giriniz",
        async validate(ans) {
            if(waynotify.includes(1) || waynotify.includes(2)) {
                if(ans.match(/^\d{17,19}$/)) {
                    if(ans == client.user.id) return "ID HATALI"
                    const target = client.users.cache.get(ans);
                    if(!target) return "KULLANICI BULUNAMADI";
                    if(target.relationships == "FRIEND") return true;
                    else if(target.relationships == "PENDING_INCOMING") {
                        try {
                            await target.setFriend();
                            return true;
                        } catch (error) {
                            return "Arkadaşlık İsteği Kabul etmiyor"
                        }
                    }
                    else if(target.relationships == "PENDING_OUTGOING") return "Lütfen Botun arkadaşlık İsteğini Kabul Edin"
                    else if(target.relationships == "NONE") {
                        try {
                            await target.sendFriendRequest();
                            return "PLütfen Botun arkadaşlık İsteğini Kabul Edin"
                        } catch (error) {
                            return "Lütfen Botun arkadaşlık İsteğini Kabul Edin"
                        }
                    }
                }
            }
            return ans.match(/^(\d{17,19}|)$/) ? true : "Hatalı UserID"
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function music1(cache) {
    const obj = {
        type: "input",
        message: "Müzik Dosyasının Windows Konumunu giriniz",
        validate(answer) {
            if(!answer.match(/^([a-zA-Z]:)?(\/?[^\/\0]+)+(\/[^\/\0]+)?$/)) return "Hatalı Konum";
            const supportedAudioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'];
            if(!fs.existsSync(answer)) return "Konum Bulunamadı";
            const stats = fs.statSync(answer)
            if(stats.isDirectory()) {
                if(fs.readdirSync(answer).some(file => supportedAudioExtensions.includes(path.extname(path.join(answer, file))))) return true;
                else return "Dosya Türü Desteklenmiyor :("
            }
            if((stats.isFile() && supportedAudioExtensions.includes(path.extname(answer)))) return true;
            return "Hatalı Konum";
        }
    };
    if(cache) obj.default = cache;
    return obj;
}

function music2(folder) {
    const supportedAudioExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac'];
    const files = fs.readdirSync(folder)
    const supportedFiles = files.filter(file => supportedAudioExtensions.includes(path.extname(file)))

    const obj = {
        type: "list",
        message: "Müzik Dosyanızı Seçiniz",
        choices: [
            {name: "Back", value: "none"},
            ...supportedFiles.map(file => ({name: file, value: path.resolve(folder, file)}))
        ]
    }
    return obj
}

function captchaAPI(cache) {
    const obj = {
        type: "list",
        message: "Captcha Çözme API Servisi Seçiniz",
        choices: [
            {name: "Atla", value: 0},
            {name: "TrueCaptcha (Ücretsiz)", value: 1},
            {name: "2Captcha (Ücretli)", value: 2},
            {name: "Selfbot Captcha Çözme API [AKTİF DEĞİL]", disabled: true}
        ],
        loop: false
    }
    if(cache) obj.default = cache;
    return obj;
}


function apiUser(cache) {
    const obj = {
        type: "input",
        message: "API User ID Giriniz",
        validate(ans) {
            return ans.match(/^\S+$/) ? true : "Hatalı API User ID"
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function apiKey(cache) {
    const obj = {
        type: "input",
        message: "API User ID Giriniz",
        validate(ans) {
            return ans.match(/^[a-zA-Z0-9]{20,}$/) ? true : "Hatalı API Key"
        }
    }
    if(cache) obj.default = cache;
    return obj;
}

function botPrefix(cache) {
    const obj = {
        type: "input",
        message: "[BETA] Lütfen Bot Prefixinizi Giriniz ",
        validate(ans) {
            if(!ans) return true
            return ans.match(/^[^0-9\s]{1,5}$/) ? true : "Hatalı Prefix";
        },
        filter(ans) {
            return ans.match(/^\s*$/) ? null : ans;
        }
    }
    if(cache) obj.default = cache
    return obj;
}

function gemOrder(cache) {
    const obj = listCheckbox(
        "list", 
        "Gem Kullanma Önceliği Seçiniz", 
        [
            {name: "İyiden Kötüye", value: 0},
            {name: "Kötüden İyiye", value: 1}
        ]
    )
    if(cache) obj.default = cache;
    return obj;
}

function resolveData(tag, token, guildID, channelID = [], wayNotify = [], musicPath, webhookURL, userNotify, captchaAPI, apiUser, apiKey, cmdPrefix, autoDaily, autoPray, autoSlash, autoGem, autoLootbox, gemOrder, autoQuote, autoOther, autoRefresh, autoSleep, autoWait) {
    return {
        tag,
        token,
        guildID,
        channelID,
        wayNotify,
        musicPath,
        webhookURL,
        userNotify,
        captchaAPI,
        apiUser,
        apiKey,
        cmdPrefix,
        autoDaily,
        autoPray,
        autoSlash,
        autoGem,
        autoLootbox,
        gemOrder,
        autoQuote,
        autoOther,
        autoRefresh,
        autoSleep,
        autoWait
    }
}

export async function collectData(data) {
    console.clear()
    await checkUpdate();
    if(JSON.stringify(data) == "{}") {
        const res = await getResult(
            trueFalse("Devam Etmek İstiyor Musunuz?", false), 
            `Copyright 2023 kiwinionana.
From Github with ❤️
Botumu Kullandığınız İçin Sonsuz Teşekkürler. y yazıp geçiniz.`
        )
        if(!res) process.exit(1)
    }
    let account
    while(!client) {
        account = await getResult(listAccount(data))
        if (account === 0) {
            const token = await getResult(getToken());
            log("Checking Account...", "i");
            client = await accountCheck(token);
        } else if (account === 1) {
            client = await accountCheck();
        } else if(account === 2){
            const profile = getAccount();
            const username = await getResult(profile[0])
            const password = await getResult(profile[1])
            const mfaCode = await getResult(profile[2])
            log("Checking Account...", "i");
            client = await accountCheck([username, password, mfaCode]);
        } else if(account === 3) {
            const choice = await getResult(listDocument());
            if(choice === 1) await getResult(listCheckbox("list", "Geri Dönmek İçin Entera Basınız", ["Geri"]), "Cömert Bağışınız İçin Teşekkür Ederim. Çok Minnettarım!\n\n   \x1b[1mİNİNAL:\x1b[0m      EYWALLAH KANKA    0978176370\n")
        } else {
            const obj = data[account];
            cache = obj;
            log("Checking Account...", "i");
            client = await accountCheck(obj.token)
        }
    }
    if(typeof client == "string") {
        log(client, "e");
        if(data[account]) accountRemove(account, data);
        process.exit(1);
    }
    client.token = await client.createToken();
    guildid = await getResult(listGuild(cache?.guildID));
    channelid = await getResult(listChannel(cache?.channelID));
    while (channelid.includes(-1)) {
        guildid = await getResult(listGuild(cache?.guildID));
        channelid = await getResult(listChannel(cache?.channelID));
    }

    waynotify = await getResult(wayNotify(cache?.wayNotify));
    if(waynotify.includes(3)) {
        musicpath = await getResult(music1(cache?.musicPath));
        while (true) {
            if (!musicpath || musicpath == "none") musicpath = await getResult(music1(cache?.musicPath));
            else if (fs.statSync(musicpath).isDirectory()) musicpath = await getResult(music2(musicpath));
            else break;
        }
    }
    if(waynotify.includes(0)) webhookurl = await getResult(webhook(cache?.webhookURL));
    if(waynotify.includes(0) || waynotify.includes(1) || waynotify.includes(2)) usernotify = await getResult(userNotify(cache?.userNotify));
    autocaptcha = await getResult(captchaAPI(cache?.captchaAPI))
    if(autocaptcha === 1) {
        apiuser = await getResult(apiUser(cache?.apiUser), "Head To This Website And SignUp/SignIn \nThen Copy The \x1b[1m\"userid\"\x1b[0m Value On [API Tab] And Paste It Here\nLink: https://truecaptcha.org/api.html")
        apikey = await getResult(apiKey(cache?.apiKey), "Head To This Website And SignUp/SignIn \nThen Copy The \x1b[1m\"apikey\"\x1b[0m Value On [API Tab] And Paste It Here\nLink: https://truecaptcha.org/api.html")
    }
    else if(autocaptcha === 2) apikey = await getResult(apiKey(cache?.apiKey), "Head To This Website And SignUp/SignIn \nThen Copy The \x1b[1m\"API Key\"\x1b[0m Value in Account Settings On [Dashboard Tab] And Paste It Here\nLink: https://2captcha.com/enterpage")
    prefix = await getResult(botPrefix(cache?.cmdPrefix))
    autodaily = await getResult(trueFalse("Otomatik Daily Atsın Mı?", cache?.autoDaily))
    autopray = await getResult(trueFalse("Otomatik Pray Atsın Mı?", cache?.autoPray))
    autoslash = await getResult(trueFalse("Slash Komutlarını Kullansın Mı?", cache?.autoSlash))
    autogem = await getResult(trueFalse("Otomatik Gem Kullansın mı?", cache?.autoGem))
    if(autogem) gemorder = await getResult(gemOrder(cache?.gemOrder))
    if(autogem) autolootbox = await getResult(trueFalse("Otomatik Lootbox Kullansın Mı?", cache?.autoLootbox))
    autoquote = await getResult(trueFalse("Level Atlamak İçin Rastgele Yazılar Yazsın Mı?", cache?.autoQuote))
    autoother = await getResult(trueFalse("Otomatik Run/Pup/Piku Komutlarını Kullansın mı?", cache?.autoOther))
    autorefresh = await getResult(trueFalse("Ayarlar Kaydedilsin Mi?", cache?.autoRefresh))
    autosleep = await getResult(trueFalse("Bot Mola Versin mi?", cache?.autoSleep))
    autowait = await getResult(trueFalse("Captcha Çözüldükten Sonra Bot Çalışmaya Devam Etsin mi?", cache?.autoWait))

    conf = resolveData(client.user.tag, client.token, guildid, channelid, waynotify, musicpath, webhookurl, usernotify, autocaptcha, apiuser, apikey, prefix, autodaily, autopray, autoslash, autogem, autolootbox, gemorder, autoquote, autoother, autorefresh, autosleep, autowait)
    data[client.user.id] = conf;
    fs.writeFileSync(DataPath, JSON.stringify(data), "utf8")
    log("Data Saved To: " + DataPath, "i")
    return { client, conf };
}
