/**
 * ============================================================================
 * ZAKE ANTI GRABBER // SCRIPT.JS
 * Sistema de Limpeza de Vírus e Grabbers em Projetos e Mods
 * ============================================================================
 */

(function () {
    'use strict';

    // Banco de dados padrão (caso o arquivo memory_rst.json não seja carregado)
    let memoryRST = {
        metadata: { version: "4.0", author: "Zake", total_signatures: 0 },
        whitelisted_contexts: [
            "require('discord.js')", "require(\"discord.js\")", "import discord", 
            "from discord", "discord.Client", "discord.WebhookClient", "https://discord.gg/",
            "ImGui::Text(\"Discord\")", "ImGui::Button(\"Join Discord\")"
        ],
        rules: [
            { id: "RST_001", name: "Comando escondido nas configurações do projeto", regex: "<PreBuildEvent>[\\s\\S]*?<\\/PreBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado" },
            { id: "RST_002", name: "Comando escondido na finalização do projeto", regex: "<PostBuildEvent>[\\s\\S]*?<\\/PostBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado" },
            { id: "RST_003", name: "Script que baixa vírus em segundo plano (PowerShell)", regex: "^.*(powershell|iwr|Invoke-WebRequest|DownloadString|Start-Process).*(-WindowStyle\\s+Hidden|-Enc|-EncodedCommand).*$", severity: "CRITICAL", action: "REMOVE_LINE", desc: "Apagar linha maliciosa" },
            { id: "RST_004", name: "Código embaralhado em Hexadecimal (esconde vírus)", regex: "^.*(\\\\x[0-9a-fA-F]{2}){15,}.*$", severity: "HIGH", action: "REMOVE_LINE", desc: "Apagar linha suspeita" },
            { id: "RST_005", name: "Comando forçando execução no Windows", regex: "^.*system\\s*\\(\\s*[a-zA-Z0-9_]+\\.c_str\\s*\\(\\s*\\)\\s*\\)\\s*;.*$", severity: "HIGH", action: "REMOVE_LINE", desc: "Apagar comando de execução" },
            { id: "RST_006", name: "Link que envia suas senhas/tokens para o hacker (Discord)", regex: "https?:\\/\\/(ptb\\.|canary\\.)?discord(app)?\\.com\\/api\\/webhooks\\/[0-9]+\\/[a-zA-Z0-9_-]+", severity: "CRITICAL", action: "REPLACE_NULL", desc: "Destruir link do Webhook" },
            { id: "RST_007", name: "Link de roubo de dados via Telegram", regex: "https?:\\/\\/api\\.telegram\\.org\\/bot[0-9]+:[a-zA-Z0-9_-]+\\/sendMessage", severity: "CRITICAL", action: "REPLACE_NULL", desc: "Destruir link do Bot" },
            { id: "RST_008", name: "Tentativa de ler senhas do Google Chrome ou Discord", regex: "^.*(Local State|Login Data|Google\\\\Chrome\\\\User Data|Cordova|leveldb|Token).*$", severity: "MEDIUM", action: "REMOVE_LINE", desc: "Apagar linha de roubo" }
        ],
        keywords_blacklist: [
            "Fwfkuuv157wg2gjthwla0lwbo1493h7", "exo-api.tf", "Retev.php", "BK291834.exe", "Berok.exe",
            "AoMiRfxV.vbs", "g2Yiw4NcWwed", "GetChunk", "AppendChunk", "Scripting.FileSystemObject",
            "TrojanWAC", "CrossRAT", "TelegramWebhook", "HookURL", "DiscordHook", "TokenGrabber",
            "Stealer", "WannaCry", "RedLine", "RaccoonStealer", "AsyncRAT", "NjRAT", "QuasarRAT",
            "Vidar", "Taurus", "MetaStealer", "DCRat", "VenomRAT", "Orcus", "LuminosityLink",
            "ImminentMonitor", "Sub7", "ProRat", "CyberGate", "Spynet", "XtremeRAT", "BlackShades",
            "NanoCore", "Remcos", "NetWire", "Gh0stRAT", "DarkComet", "DiscordNitroHack",
            "RobloxCookieGrabber", "SteamStealer", "EpicGamesStealer", "TelegramSessionGrabber"
        ]
    };

    let loadedZipObject = null;
    let originalFileName = "";
    let detectedAnomalies = [];
    let countTotal = 0;

    // INICIALIZAÇÃO
    document.addEventListener("DOMContentLoaded", async () => {
        addLog("[ Sistema ] Inicializando removedor de vírus Zake Anti Grabber...", "log-sys");
        await loadMemoryRSTData();
        setupEventListeners();
    });

    /**
     * Carrega a lista de vírus atualizada do servidor (memory_rst.json)
     */
    async function loadMemoryRSTData() {
        try {
            const response = await fetch('memory_rst.json', { cache: 'no-store' });
            if (!response.ok) throw new Error("Falha no servidor");
            const data = await response.json();
            
            if (data.rules && data.keywords_blacklist) {
                memoryRST = data;
                const total = (memoryRST.rules.length || 0) + (memoryRST.keywords_blacklist.length || 0);
                document.getElementById("db-count").textContent = `${total} vírus conhecidos`;
                addLog(`[ Sistema ] Lista de vírus atualizada carregada (${total} assinaturas).`, "log-sys");
            }
        } catch (error) {
            const total = memoryRST.rules.length + memoryRST.keywords_blacklist.length;
            document.getElementById("db-count").textContent = `${total} vírus conhecidos (base interna)`;
            addLog("[ Aviso ] Rodando com a base de dados interna offline.", "log-warn");
        }
    }

    // EVENTOS DO USUÁRIO
    function setupEventListeners() {
        const dropzone = document.getElementById("dropzone");
        const fileInput = document.getElementById("fileInput");
        const jsonInput = document.getElementById("jsonInput");
        const btnClearTerminal = document.getElementById("btn-clear-terminal");
        const btnCompile = document.getElementById("btn-compile");

        if (dropzone && fileInput) {
            dropzone.addEventListener("click", () => fileInput.click());
            dropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropzone.style.borderColor = "#ffffff";
            });
            dropzone.addEventListener("dragleave", () => {
                dropzone.style.borderColor = "";
            });
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.style.borderColor = "";
                if (e.dataTransfer.files.length > 0) startScan(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener("change", (e) => {
                if (e.target.files.length > 0) startScan(e.target.files[0]);
            });
        }

        // Importar lista customizada (.json)
        if (jsonInput) {
            jsonInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const customJSON = JSON.parse(event.target.result);
                            if (customJSON.rules && customJSON.keywords_blacklist) {
                                memoryRST = customJSON;
                                const total = memoryRST.rules.length + memoryRST.keywords_blacklist.length;
                                document.getElementById("db-count").textContent = `${total} vírus conhecidos`;
                                addLog("[ Sistema ] Nova lista de vírus aplicada com sucesso!", "log-sys");
                            }
                        } catch (err) {
                            addLog("[ Erro ] O arquivo .json enviado é inválido.", "log-danger");
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }

        if (btnClearTerminal) btnClearTerminal.addEventListener("click", clearTerminal);
        if (btnCompile) btnCompile.addEventListener("click", applySanitizationAndCompile);

        // Filtros simples do terminal
        document.querySelectorAll(".terminal-filters .t-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const filterClass = e.target.getAttribute("data-filter");
                filterLogs(filterClass, e.target);
            });
        });
    }

    // TELEMETRIA / MENSAGENS NA TELA
    function addLog(text, className = "log-info") {
        const terminal = document.getElementById("terminal");
        if (!terminal) return;
        const line = document.createElement("div");
        line.className = `log-line ${className}`;
        line.textContent = text;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function clearTerminal() {
        const terminal = document.getElementById("terminal");
        if (terminal) {
            terminal.innerHTML = "";
            addLog("[ Sistema ] Avisos limpos.", "log-sys");
        }
    }

    function filterLogs(filterClass, btnElement) {
        document.querySelectorAll(".terminal-filters .t-btn").forEach(b => b.classList.remove("active"));
        btnElement.classList.add("active");
        
        document.querySelectorAll(".log-line").forEach(line => {
            if (filterClass === "all" || line.classList.contains(filterClass)) {
                line.style.display = "block";
            } else {
                line.style.display = "none";
            }
        });
    }

    function resetSystem() {
        countTotal = 0;
        detectedAnomalies = [];
        loadedZipObject = null;
        
        document.getElementById("stat-total").textContent = "0";
        document.getElementById("stat-threats").textContent = "0";
        document.getElementById("stat-pending").textContent = "0";
        
        const statStatus = document.getElementById("stat-status");
        statStatus.textContent = "VERIFICANDO...";
        statStatus.className = "stat-number val-yellow";
        
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.add("hidden-section");
        document.getElementById("vt-tbody").innerHTML = "";
        
        const btnCompile = document.getElementById("btn-compile");
        btnCompile.setAttribute("disabled", "true");
        btnCompile.querySelector("span").textContent = "1. Limpar e Criar Arquivo";
        
        const btnDownload = document.getElementById("btn-download");
        if (btnDownload) btnDownload.classList.add("hidden-btn");
    }

    // ============================================================================
    // MOTOR DE VERIFICAÇÃO DE VÍRUS
    // ============================================================================
    async function startScan(file) {
        resetSystem();
        originalFileName = file.name;
        const isRar = originalFileName.toLowerCase().endsWith(".rar");
        const passwordInput = document.getElementById("archivePassword");
        const password = passwordInput ? passwordInput.value.trim() : "";

        addLog(`[ Sistema ] Abrindo o arquivo: ${originalFileName}`, "log-sys");
        
        if (isRar) {
            addLog("[ Aviso ] Arquivo .RAR detectado. Ele será verificado e transformado em um .ZIP limpo.", "log-warn");
        }
        if (password) {
            addLog("[ Sistema ] Usando a senha informada para destrancar o arquivo...", "log-sys");
        }

        try {
            const zip = new JSZip();
            loadedZipObject = await zip.loadAsync(file, { password: password || undefined });
            
            const entries = Object.keys(loadedZipObject.files);
            addLog(`[ Sistema ] Arquivo aberto com sucesso! Verificando ${entries.length} itens dentro dele...`, "log-info");
            
            // Extensões de arquivos perigosos
            const bannedExtensions = [".exe", ".scr", ".vbs", ".bat", ".cmd", ".ps1", ".pif"];
            // Extensões de código onde os vírus se escondem
            const textExtensions = [".vcxproj", ".sln", ".cpp", ".h", ".hpp", ".c", ".cs", ".js", ".ts", ".py", ".txt", ".json", ".xml", ".html", ".css", ".md", ".ini", ".php"];

            for (let i = 0; i < entries.length; i++) {
                const filename = entries[i];
                const fileObj = loadedZipObject.files[filename];
                if (fileObj.dir) continue;

                countTotal++;
                document.getElementById("stat-total").textContent = countTotal;
                const lowerName = filename.toLowerCase();
                const ext = lowerName.substring(lowerName.lastIndexOf("."));

                // 1. Achar arquivos executáveis soltos (vírus/trojans)
                if (bannedExtensions.includes(ext)) {
                    detectedAnomalies.push({
                        id: `ANOM_${detectedAnomalies.length}`,
                        filename: filename,
                        ruleName: "Arquivo executável perigoso encontrado",
                        severity: "CRITICAL",
                        actionType: "DELETE_FILE",
                        actionDesc: "Excluir arquivo completamente",
                        checked: true
                    });
                    addLog(`[ PERIGO ] Arquivo suspeito de ser vírus encontrado: ${filename}`, "log-danger");
                    continue;
                }

                // 2. Achar códigos maliciosos dentro dos scripts do projeto
                if (textExtensions.includes(ext)) {
                    let content = "";
                    try {
                        content = await fileObj.async("string");
                    } catch (encErr) {
                        continue;
                    }

                    // Ignorar códigos seguros conhecidos (para não quebrar bibliotecas normais como discord.js)
                    let isWhitelisted = false;
                    for (const white of memoryRST.whitelisted_contexts) {
                        if (content.includes(white)) {
                            isWhitelisted = true;
                            break;
                        }
                    }

                    // Checar contra as regras principais
                    for (const rule of memoryRST.rules) {
                        const regex = new RegExp(rule.regex, "gim");
                        if (regex.test(content)) {
                            detectedAnomalies.push({
                                id: `ANOM_${detectedAnomalies.length}`,
                                filename: filename,
                                ruleName: rule.name,
                                severity: rule.severity,
                                actionType: rule.action,
                                regex: rule.regex,
                                actionDesc: rule.desc || "Apagar código malicioso",
                                checked: true
                            });
                            addLog(`[ PERIGO ] ${rule.name} encontrado em: ${filename}`, "log-danger");
                        }
                    }

                    // Checar contra a lista de palavras de vírus conhecidos
                    if (!isWhitelisted) {
                        for (const kw of memoryRST.keywords_blacklist) {
                            if (content.includes(kw)) {
                                detectedAnomalies.push({
                                    id: `ANOM_${detectedAnomalies.length}`,
                                    filename: filename,
                                    ruleName: `Nome de vírus/grabber conhecido ('${kw}')`,
                                    severity: "HIGH",
                                    actionType: "REMOVE_KEYWORD_LINE",
                                    keyword: kw,
                                    actionDesc: "Apagar linha infectada",
                                    checked: true
                                });
                                addLog(`[ Aviso ] Palavra ligada a vírus ('${kw}') encontrada em: ${filename}`, "log-warn");
                            }
                        }
                    }
                }
            }

            // Atualizar os números na tela
            document.getElementById("stat-threats").textContent = detectedAnomalies.length;
            document.getElementById("stat-pending").textContent = detectedAnomalies.length;
            
            const statStatus = document.getElementById("stat-status");
            if (detectedAnomalies.length > 0) {
                statStatus.textContent = "INFECTADO";
                statStatus.className = "stat-number val-red";
                
                addLog(`[ Verificação Concluída ] Encontramos ${detectedAnomalies.length} problemas! Veja a tabela acima.`, "log-warn");
                renderVTDashboard();
                document.getElementById("btn-compile").removeAttribute("disabled");
            } else {
                statStatus.textContent = "LIMPO";
                statStatus.className = "stat-number val-green";
                
                addLog("[ Seguro ] Nenhum vírus ou grabber foi encontrado no seu arquivo!", "log-clean");
                const btnCompile = document.getElementById("btn-compile");
                btnCompile.querySelector("span").textContent = "O arquivo já está seguro!";
            }

        } catch (error) {
            if (error.message.includes("encrypted") || error.message.includes("password")) {
                addLog("[ Erro ] O arquivo tem senha. Por favor, digite a senha no campo acima e arraste o arquivo de novo.", "log-danger");
            } else {
                addLog(`[ Erro ] Não conseguimos ler o arquivo: ${error.message}`, "log-danger");
            }
            const statStatus = document.getElementById("stat-status");
            statStatus.textContent = "ERRO";
            statStatus.className = "stat-number val-red";
        }
    }

    // ============================================================================
    // TABELA SIMPLIFICADA DE RESULTADOS (4 COLUNAS)
    // ============================================================================
    function renderVTDashboard() {
        const vtTbody = document.getElementById("vt-tbody");
        if (!vtTbody) return;

        vtTbody.innerHTML = "";
        document.getElementById("vt-summary").textContent = `${detectedAnomalies.length} Ameaças`;
        
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.remove("hidden-section");

        detectedAnomalies.forEach((item, index) => {
            const tr = document.createElement("tr");
            
            // Traduzir gravidade para termos super simples
            let sevText = "Atenção";
            let sevClass = "sev-MEDIUM";
            if (item.severity === "CRITICAL") { sevText = "Perigo Alto"; sevClass = "sev-CRITICAL"; }
            if (item.severity === "HIGH") { sevText = "Suspeito"; sevClass = "sev-HIGH"; }

            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" id="chk_${index}" checked onchange="toggleAnomaly(${index}, this.checked)" class="custom-checkbox" />
                </td>
                <td style="font-weight: 600; color: #fff;">${item.filename}</td>
                <td>
                    <span style="display: block; margin-bottom: 3px;">${item.ruleName}</span>
                    <span class="tag-severity ${sevClass}">${sevText}</span>
                </td>
                <td style="color: var(--color-yellow); font-weight: 500;">${item.actionDesc}</td>
            `;
            vtTbody.appendChild(tr);
        });
    }

    window.toggleAnomaly = function(index, isChecked) {
        detectedAnomalies[index].checked = isChecked;
        const countChecked = detectedAnomalies.filter(a => a.checked).length;
        document.getElementById("stat-pending").textContent = countChecked;
        addLog(`[ Ajuste ] O arquivo '${detectedAnomalies[index].filename}' ${isChecked ? "será limpo" : "será mantido como está"}.`, "log-info");
    };

    // ============================================================================
    // CRIAR E BAIXAR O NOVO ARQUIVO LIMPO
    // ============================================================================
    async function applySanitizationAndCompile() {
        const btnCompile = document.getElementById("btn-compile");
        btnCompile.setAttribute("disabled", "true");
        btnCompile.querySelector("span").textContent = "Limpando e criando arquivo...";
        
        addLog("[ Sistema ] Iniciando a remoção dos vírus selecionados...", "log-sys");
        
        const cleanZip = new JSZip();
        const entries = Object.keys(loadedZipObject.files);
        let removedFilesCount = 0;
        let modifiedFilesCount = 0;

        for (const filename of entries) {
            const fileObj = loadedZipObject.files[filename];
            if (fileObj.dir) {
                cleanZip.folder(filename);
                continue;
            }

            // Excluir arquivos executáveis marcados
            const deleteOrders = detectedAnomalies.filter(a => a.filename === filename && a.actionType === "DELETE_FILE" && a.checked);
            if (deleteOrders.length > 0) {
                removedFilesCount++;
                addLog(`[ Apagado ] Arquivo perigoso excluído: ${filename}`, "log-danger");
                continue;
            }

            // Limpar códigos maliciosos marcados
            const modifyOrders = detectedAnomalies.filter(a => a.filename === filename && a.actionType !== "DELETE_FILE" && a.checked);
            if (modifyOrders.length > 0) {
                let content = await fileObj.async("string");
                modifyOrders.forEach(order => {
                    if (order.actionType === "REMOVE_BLOCK" || order.actionType === "REMOVE_LINE") {
                        const reg = new RegExp(order.regex, "gim");
                        content = content.replace(reg, "");
                    } else if (order.actionType === "REPLACE_NULL") {
                        const reg = new RegExp(order.regex, "gim");
                        content = content.replace(reg, "https://discord.com/api/webhooks/LINK_DE_VIRUS_REMOVIDO");
                    } else if (order.actionType === "REMOVE_KEYWORD_LINE") {
                        const lines = content.split("\n");
                        const cleanLines = lines.filter(l => !l.includes(order.keyword));
                        content = cleanLines.join("\n");
                    }
                });
                cleanZip.file(filename, content);
                modifiedFilesCount++;
                addLog(`[ Limpo ] Vírus removido de dentro de: ${filename}`, "log-clean");
            } else {
                // Manter arquivo normal que não tem vírus ou que o usuário desmarcou
                const binaryData = await fileObj.async("blob");
                cleanZip.file(filename, binaryData);
            }
        }

        addLog("[ Sistema ] Empacotando o novo arquivo .ZIP seguro...", "log-sys");
        const generatedBlob = await cleanZip.generateAsync({ type: "blob" });
        const downloadUrl = URL.createObjectURL(generatedBlob);

        let cleanName = originalFileName.replace(/(\.zip|\.rar)$/i, "");
        cleanName += "_LIMPO_ZAKE.zip";

        const btnDownload = document.getElementById("btn-download");
        if (btnDownload) {
            btnDownload.setAttribute("href", downloadUrl);
            btnDownload.setAttribute("download", cleanName);
            btnDownload.classList.remove("hidden-btn");
            btnDownload.style.display = "inline-flex";
        }
        
        const statStatus = document.getElementById("stat-status");
        statStatus.textContent = "PURIFICADO";
        statStatus.className = "stat-number val-green";
        
        btnCompile.querySelector("span").textContent = "Limpeza Concluída!";
        addLog(`[ Sucesso ] Tudo pronto! Excluímos ${removedFilesCount} arquivos ruins e limpamos o código de ${modifiedFilesCount} arquivos. Clique no botão verde para baixar!`, "log-clean");
    }

})();