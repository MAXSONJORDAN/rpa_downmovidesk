const { default: axios } = require("axios");
const fs = require("fs");
const fsP = require("fs/promises");
const request = require("request");
const readline = require('readline');
const configs = require('./configs.json');

const itensPorVez = configs.itensPorVez;


const start = async () => {
    console.log("Iniciando Bot");
    console.log("Buscando lista na API...");
    const total = configs.totalDeItens;
    let baixados = [];
    for (let i = 1; i < total; i += itensPorVez) {
        const log = (baixados) => {
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, null);
            process.stdout.write(`(${baixados.length}/${total}) - Baixado` + "- Faixa de " + (i - 1) + " Até " + ((i - 1) + itensPorVez) + "  " + ((baixados.length / total * 100).toFixed(2)) + "% Concluídos");
            readline.moveCursor(process.stdout, 1000);
        }
        let status = {};
        let timeToTimes = 0;
        const isDone = () => new Promise(async resolve => {
            let timeInit = new Date().getTime();
            let notYet = true;
            while (notYet) {
                let check = false;
                for (let key = i; key < total && key < (i + itensPorVez); key++) {
                    if (!status[key]) {
                        check = true;
                    }
                }
                if (check)
                    await sleep(1000);
                notYet = check;
            }
            timeToTimes = new Date().getTime() - timeInit;
            //console.log("times here", timeToTimes);
            resolve(true);
        })


        for (let ticketId = i; ticketId < (i + itensPorVez); ticketId++) {

            try {



                const path = "tickets/" + ticketId;
                if (!fs.existsSync(path) || !fs.existsSync(path + "/" + ticketId + ".json")) {
                    //console.log(`(${baixados.length}/${total}) - Baixando...`);
                    //console.log("Gerando dir ", path);
                    if (!fs.existsSync(path))
                        await fsP.mkdir(path);
                    //console.log("Dir gerado. ");
                    axios.get("https://api.movidesk.com/public/v1/tickets",
                        {
                            params: {
                                token: "abca89f4-4103-4bf4-8b26-6c3b4e065101",
                                $select: "id",
                                $expand: "actions($expand=attachments($select=filename,path))",
                                $filter: `id eq ${ticketId}`
                            }
                        }).then(async axiosResult => {
                            if (axiosResult.data && typeof (axiosResult.data) === "object") {
                                //console.log("Busca da api ok");

                                let item = axiosResult.data;
                                try {


                                    if (item.length > 0) {

                                        let actions = item[0].actions;
                                        //console.log("Actions = ", actions.length);
                                        if (actions && actions.length > 0) {
                                            for (let index = 0; index < actions.length; index++) {
                                                const action = actions[index];
                                                let arquivos = action.attachments;
                                                for (let j = 0; j < arquivos.length; j++) {
                                                    const arquivo = arquivos[j];
                                                    //console.log("antes de baixar");
                                                    await download(`https://s3.amazonaws.com/movidesk-files/${arquivo.path}`, path + "/" + clearText(arquivo.fileName)).then(end => {
                                                        //console.log(end)
                                                    });
                                                    //console.log("depois de baixar");
                                                }

                                            }
                                        }
                                    }
                                    //console.log("Tentando baixar arquivo json");
                                    let responseString = null;
                                    await axios.get("https://api.movidesk.com/public/v1/tickets",
                                        {
                                            params: {
                                                token: "abca89f4-4103-4bf4-8b26-6c3b4e065101",
                                                id: `${ticketId}`
                                            }
                                        }).then(axiosResponse => {
                                            if (axiosResponse.status === 200) {
                                                try {
                                                    responseString = JSON.stringify(axiosResponse.data);
                                                } catch (error) {

                                                }
                                            } else {
                                                if (axiosResponse.status === 404) {
                                                    responseString = JSON.stringify(axiosResponse);
                                                }
                                            }
                                        }).catch(err => {
                                            if (err.response.status === 404) {
                                                let res = { success: false, data: "Não encontrado!" };
                                                responseString = JSON.stringify(res);
                                            }
                                        })

                                    if (responseString) {
                                        await fsP.writeFile(path + "/" + ticketId + ".json", responseString);
                                        //console.log("Arquivo json Salvo");
                                    }

                                } catch (error) {

                                }


                            } else {
                                console.log(`\nTicket ${ticketId} - FAIL`);
                            }

                        }).catch(() => {
                            console.log(`\nTicket ${ticketId} - FAIL - NETWORK`);
                        }).finally(() => {
                            baixados.push(true);
                            status[ticketId] = true;
                            log(baixados);
                        });

                } else {
                    status[ticketId] = true;
                    baixados.push(true);
                }

            } catch (error) {
                status[ticketId] = true;
                baixados.push(true);
            }

        }
        await isDone();
        log(baixados);
    }


}

const sleep = (milis) => new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(milis);
    }, milis)
});

const calculeTime = (mili, velocidade, total) => {
    console.log("milis", mili)
    mili = (mili / velocidade) * total;
    let segundos = mili / 1000;
    (segundos / 20)
    let minutos = segundos / 60;
    let horas = minutos / 60;
    let dias = horas / 24;

    return `- Termina em ${horas.toFixed(2)}horas`;
}
const clearText = (text) => {

    let splitedText = text.split("");
    let clearSplited = [];
    for (let i = 0; i < splitedText.length; i++) {
        const charItem = splitedText[i];
        if (charItem.match(/^[0-9a-zA-Z.]+$/)) {
            clearSplited.push(charItem);
        } else {
            clearSplited.push('N', 'a', 'C');
        }
    }
    let result = clearSplited.join("");
    return result;
}
const download = (uri, filename) => new Promise((resolve, reject) => {
    request.head(uri, function (err, res, body) {
        request(uri).pipe(fs.createWriteStream(filename)).on('close', () => resolve(err));
    });
});

start();