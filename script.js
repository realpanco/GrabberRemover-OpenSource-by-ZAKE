/**
 * ============================================================================
 * ZAKE ANTI GRABBER // SCRIPT.JS (CORRIGIDO - ZERO FALSOS POSITIVOS)
 * ============================================================================
 */

(function () {
    'use strict';

    // Banco de dados otimizado (sem palavras curtas que geram falso positivo)
    let memoryRST = {
        metadata: { version: "4.1", author: "Zake", total_signatures: 0 },
        whitelisted_contexts: [
            "require('discord.js')", "require(\"discord.js\")", "import discord", 
            "from discord", "discord.Client", "discord.WebhookClient", "https://discord.gg/",
            "ImGui::Text", "ImGui::Button", "ImGui_ImplDX12_", "ImGui_ImplDX9_", 
            "ImGui_ImplWin32_", "CreateDeviceD3D", "CleanupDeviceD3D", "LRESULT WINAPI"
        ],
        rules: [
            { id: "RST_001", name: "Comando escondido nas configurações do projeto", regex: "<PreBuildEvent>[\\s\\S]*?<\\/PreBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado" },
            { id: "RST_002", name: "Comando escondido na finalização do projeto", regex: "<PostBuildEvent>[\\s\\S]*?<\\/PostBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado" },
            { id: "RST_003", name: "Script que baixa vírus em segundo plano (PowerShell)", regex: "^.*(powershell|iwr|Invoke-WebRequest|DownloadString|Start-Process).*(-WindowStyle\\s+Hidden|-Enc|-EncodedCommand).*$", severity: "CRITICAL", action: "REMOVE_LINE", desc: "Apagar linha maliciosa" },
            { id: "RST_004", name: "Código embaralhado em Hexadecimal (esconde vírus)", regex: "^.*(\\\\x[0-9a-fA-F]{2}){15,}.*$", severity: "HIGH", action: "REMOVE_LINE", desc: "Apagar linha suspeita" },
            { id: "RST_005", name: "Comando forçando execução oculta no Windows", regex: "^.*system\\s*\\(\\s*[a-zA-Z0-9_]+\\.c_str\\s*\\(\\s*\\)\\s*\\)\\s*;.*$", severity: "HIGH", action: "REMOVE_LINE", desc: "Apagar comando de execução" },
            { id: "RST_006", name: "Link que envia suas senhas/tokens para o hacker (Discord)", regex: "https?:\\/\\/(ptb\\.|canary\\.)?discord(app)?\\.com\\/api\\/webhooks\\/[0-9]+\\/[a-zA-Z0-9_-]+", severity: "CRITICAL", action: "REPLACE_NULL", desc: "Destruir link do Webhook" },
            { id: "RST_007", name: "Link de roubo de dados via Telegram", regex: "https?:\\/\\/api\\.telegram\\.org\\/bot[0-9]+:[a-zA-Z0-9_-]+\\/sendMessage", severity: "CRITICAL", action: "REPLACE_NULL", desc: "Destruir link do Bot" },
            { id: "RST_008", name: "Tentativa de ler senhas do Google Chrome ou Discord", regex: "^.*(Local State|Login Data|Google\\\\Chrome\\\\User Data|Cordova|leveldb).*$", severity: "MEDIUM", action: "REMOVE_LINE", desc: "Apagar linha de roubo" }
        ],
        keywords_blacklist: [
            "Fwfkuuv157wg2gjthwla0lwbo1493h7", "exo-api.tf", "Retev.php", "BK291834.exe", "Berok.exe",
            "AoMiRfxV.vbs", "g2Yiw4NcWwed", "GetChunk", "AppendChunk", "Scripting.FileSystemObject",
            "TrojanWAC", "CrossRAT", "TelegramWebhook", "HookURL", "DiscordHook", "TokenGrabber",
            "WannaCry", "RedLine", "RaccoonStealer", "AsyncRAT", "NjRAT", "QuasarRAT",
            "Vidar", "Taurus", "MetaStealer", "DCRat", "VenomRAT", "LuminosityLink",
            "ImminentMonitor", "Sub7", "ProRat", "CyberGate", "Spynet", "XtremeRAT", "BlackShades",
            "NanoCore", "Remcos", "NetWire", "Gh0stRAT", "DarkComet", "DiscordNitroHack",
            "RobloxCookieGrabber", "SteamStealer", "EpicGamesStealer", "TelegramSessionGrabber"
        ]
    };

    let loadedZipObject = null;
    let originalFileName = "";
    let detectedAnomalies = [];
    let countTotal = 0;

    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners();
        addLog("[ Sistema ] Pronto para verificar seus arquivos (Modo de Precisão Ativado).", "log-sys");
        loadMemoryRSTData();
    });

    async function loadMemoryRSTData() {
        try {
            const response = await fetch('memory_rst.json', { cache: 'no-store' });
            if (!response.ok) throw new Error("HTTP Error");
            const data = await response.json();
            
            if (data && data.rules && data.keywords_blacklist) {
                // Filtramos a blacklist externa para remover palavras curtas (< 4 letras) que causam falso positivo
                data.keywords_blacklist = data.keywords_blacklist.filter(kw => kw.length >= 4 && !["token", "rat", "chat", "host", "link", "temp", "bind", "info"].includes(kw.toLowerCase()));
                memoryRST = data;
                const total = (memoryRST.rules.length || 0) + (memoryRST.keywords_blacklist.length || 0);
                const dbCount = document.getElementById("db-count");
                if (dbCount) dbCount.textContent = `${total} vírus conhecidos`;
                addLog(`[ Sistema ] Base de dados carregada com sucesso (${total} assinaturas precisas).`, "log-sys");
            }
        } catch (error) {
            const total = (memoryRST.rules?.length || 0) + (memoryRST.keywords_blacklist?.length || 0);
            const dbCount = document.getElementById("db-count");
            if (dbCount) dbCount.textContent = `${total} vírus (base padrão)`;
        }
    }

    function setupEventListeners() {
        const dropzone = document.getElementById("dropzone");
        const fileInput = document.getElementById("fileInput");
        const jsonInput = document.getElementById("jsonInput");
        const btnImportJson = document.getElementById("btn-import-json");
        const btnClearTerminal = document.getElementById("btn-clear-terminal");
        const btnCompile = document.getElementById("btn-compile");

        if (dropzone && fileInput) {
            dropzone.addEventListener("click", () => fileInput.click());
            dropzone.addEventListener("dragover", (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add("dragover"); });
            dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove("dragover"); });
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault(); e.stopPropagation(); dropzone.classList.remove("dragover");
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) startScan(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener("change", (e) => {
                if (e.target.files && e.target.files.length > 0) startScan(e.target.files[0]);
            });
        }

        if (btnImportJson && jsonInput) {
            btnImportJson.addEventListener("click", (e) => { e.preventDefault(); jsonInput.click(); });
            jsonInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const customJSON = JSON.parse(event.target.result);
                            if (customJSON.rules && customJSON.keywords_blacklist) {
                                customJSON.keywords_blacklist = customJSON.keywords_blacklist.filter(kw => kw.length >= 4 && !["token", "rat", "chat", "host", "link", "temp", "bind", "info"].includes(kw.toLowerCase()));
                                memoryRST = customJSON;
                                const total = memoryRST.rules.length + memoryRST.keywords_blacklist.length;
                                const dbCount = document.getElementById("db-count");
                                if (dbCount) dbCount.textContent = `${total} vírus conhecidos`;
                                addLog("[ Sistema ] Nova lista de vírus aplicada (com filtro anti falso-positivo)!", "log-sys");
                            }
                        } catch (err) { addLog("[ Erro ] O arquivo .json enviado é inválido.", "log-danger"); }
                    };
                    reader.readAsText(file);
                }
            });
        }

        if (btnClearTerminal) btnClearTerminal.addEventListener("click", clearTerminal);
        if (btnCompile) btnCompile.addEventListener("click", applySanitizationAndCompile);

        document.querySelectorAll(".terminal-filters .t-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const filterClass = e.target.getAttribute("data-filter");
                filterLogs(filterClass, e.target);
            });
        });
    }

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
        if (statStatus) { statStatus.textContent = "VERIFICANDO..."; statStatus.className = "stat-number val-yellow"; }
        
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.add("hidden-section");
        
        const vtTbody = document.getElementById("vt-tbody");
        if (vtTbody) vtTbody.innerHTML = "";
        
        const btnCompile = document.getElementById("btn-compile");
        if (btnCompile) {
            btnCompile.setAttribute("disabled", "true");
            const btnSpan = btnCompile.querySelector("span");
            if (btnSpan) btnSpan.textContent = "1. Limpar e Criar Arquivo";
        }
        
        const btnDownload = document.getElementById("btn-download");
        if (btnDownload) btnDownload.classList.add("hidden-btn");
    }

    // ============================================================================
    // MOTOR DE VARREDURA DE ALTA PRECISÃO
    // ============================================================================
    async function startScan(file) {
        resetSystem();
        originalFileName = file.name;
        const isRar = originalFileName.toLowerCase().endsWith(".rar");
        const passwordInput = document.getElementById("archivePassword");
        const password = passwordInput ? passwordInput.value.trim() : "";

        addLog(`[ Sistema ] Analisando o arquivo: ${originalFileName}`, "log-sys");
        if (isRar) addLog("[ Aviso ] Arquivo .RAR detectado. Ele será verificado e transformado em um .ZIP limpo.", "log-warn");
        if (password) addLog("[ Sistema ] Usando a senha informada para abrir o arquivo...", "log-sys");

        try {
            const zip = new JSZip();
            loadedZipObject = await zip.loadAsync(file, { password: password || undefined });
            
            const entries = Object.keys(loadedZipObject.files);
            addLog(`[ Sistema ] Arquivo aberto! Verificando ${entries.length} itens internos com filtro de precisão...`, "log-info");
            
            const bannedExtensions = [".exe", ".scr", ".vbs", ".bat", ".cmd", ".ps1", ".pif"];
            const textExtensions = [".vcxproj", ".sln", ".cpp", ".h", ".hpp", ".c", ".cs", ".js", ".ts", ".py", ".txt", ".json", ".xml", ".html", ".css", ".md", ".ini", ".php"];

            for (let i = 0; i < entries.length; i++) {
                const filename = entries[i];
                const fileObj = loadedZipObject.files[filename];
                if (fileObj.dir) continue;

                countTotal++;
                document.getElementById("stat-total").textContent = countTotal;
                const lowerName = filename.toLowerCase();
                const ext = lowerName.substring(lowerName.lastIndexOf("."));

                // 1. Arquivos executáveis soltos (vírus ou scripts executáveis)
                if (bannedExtensions.includes(ext)) {
                    detectedAnomalies.push({
                        id: `ANOM_${detectedAnomalies.length}`,
                        filename: filename,
                        ruleName: "Arquivo executável suspeito encontrado",
                        severity: "CRITICAL",
                        actionType: "DELETE_FILE",
                        actionDesc: "Excluir arquivo completamente",
                        checked: true
                    });
                    addLog(`[ PERIGO ] Arquivo executável suspeito encontrado: ${filename}`, "log-danger");
                    continue;
                }

                // 2. Códigos em scripts ou arquivos c++/c#
                if (textExtensions.includes(ext)) {
                    let content = "";
                    try { content = await fileObj.async("string"); } catch (encErr) { continue; }

                    // Se contiver elementos conhecidos de whitelist, nós ignoramos certas palavras comuns
                    let isWhitelisted = false;
                    for (const white of memoryRST.whitelisted_contexts) {
                        if (content.includes(white)) { isWhitelisted = true; break; }
                    }

                    // Checagem de Regras (Injeções Reais no Visual Studio ou Webhooks)
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

                    // Checagem por Palavra-Chave de Vírus (Com proteção anti falso positivo)
                    if (!isWhitelisted) {
                        for (const kw of memoryRST.keywords_blacklist) {
                            // Ignora palavras curtas se for arquivo C++ do ImGui, DirectX, OpenGL ou DirectX
                            if (["imgui", "directx", "opengl", "vendor", "backend"].some(safe => lowerName.includes(safe))) {
                                if (kw.length < 8) continue; // Só aponta se for palavra longa e clara de vírus
                            }

                            if (content.includes(kw)) {
                                detectedAnomalies.push({
                                    id: `ANOM_${detectedAnomalies.length}`,
                                    filename: filename,
                                    ruleName: `Assinatura clara de grabber/vírus ('${kw}')`,
                                    severity: "HIGH",
                                    actionType: "REMOVE_KEYWORD_LINE",
                                    keyword: kw,
                                    actionDesc: "Apagar linha infectada",
                                    checked: true
                                });
                                addLog(`[ Aviso ] Assinatura de vírus ('${kw}') encontrada em: ${filename}`, "log-warn");
                            }
                        }
                    }
                }
            }

            document.getElementById("stat-threats").textContent = detectedAnomalies.length;
            document.getElementById("stat-pending").textContent = detectedAnomalies.length;
            
            const statStatus = document.getElementById("stat-status");
            if (detectedAnomalies.length > 0) {
                if (statStatus) { statStatus.textContent = "INFECTADO"; statStatus.className = "stat-number val-red"; }
                addLog(`[ Concluído ] Encontramos ${detectedAnomalies.length} ameaças reais no seu arquivo!`, "log-warn");
                renderVTDashboard();
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) btnCompile.removeAttribute("disabled");
            } else {
                if (statStatus) { statStatus.textContent = "LIMPO"; statStatus.className = "stat-number val-green"; }
                addLog("[ Seguro ] Nenhum vírus ou grabber foi encontrado no seu arquivo!", "log-clean");
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) btnCompile.querySelector("span").textContent = "O arquivo já está seguro!";
            }

        } catch (error) {
            if (error.message && (error.message.includes("encrypted") || error.message.includes("password"))) {
                addLog("[ Erro ] O arquivo tem senha. Por favor, digite a senha no campo acima e arraste o arquivo de novo.", "log-danger");
            } else { addLog(`[ Erro ] Não foi possível ler o arquivo enviado.`, "log-danger"); }
            const statStatus = document.getElementById("stat-status");
            if (statStatus) { statStatus.textContent = "ERRO"; statStatus.className = "stat-number val-red"; }
        }
    }

    function renderVTDashboard() {
        const vtTbody = document.getElementById("vt-tbody");
        if (!vtTbody) return;
        vtTbody.innerHTML = "";
        const vtSummary = document.getElementById("vt-summary");
        if (vtSummary) vtSummary.textContent = `${detectedAnomalies.length} Ameaças`;
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.remove("hidden-section");

        detectedAnomalies.forEach((item, index) => {
            const tr = document.createElement("tr");
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

    async function applySanitizationAndCompile() {
        const btnCompile = document.getElementById("btn-compile");
        if (btnCompile) {
            btnCompile.setAttribute("disabled", "true");
            const btnSpan = btnCompile.querySelector("span");
            if (btnSpan) btnSpan.textContent = "Limpando e criando arquivo...";
        }
        
        addLog("[ Sistema ] Removendo os vírus selecionados...", "log-sys");
        const cleanZip = new JSZip();
        const entries = Object.keys(loadedZipObject.files);
        let removedFilesCount = 0;
        let modifiedFilesCount = 0;

        for (const filename of entries) {
            const fileObj = loadedZipObject.files[filename];
            if (fileObj.dir) { cleanZip.folder(filename); continue; }

            const deleteOrders = detectedAnomalies.filter(a => a.filename === filename && a.actionType === "DELETE_FILE" && a.checked);
            if (deleteOrders.length > 0) {
                removedFilesCount++;
                addLog(`[ Apagado ] Arquivo perigoso excluído: ${filename}`, "log-danger");
                continue;
            }

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
                const binaryData = await fileObj.async("blob");
                cleanZip.file(filename, binaryData);
            }
        }

        addLog("[ Sistema ] Empacotando novo arquivo limpo...", "log-sys");
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
        if (statStatus) { statStatus.textContent = "PURIFICADO"; statStatus.className = "stat-number val-green"; }
        if (btnCompile) { const btnSpan = btnCompile.querySelector("span"); if (btnSpan) btnSpan.textContent = "Limpeza Concluída!"; }
        
        addLog(`[ Sucesso ] Tudo pronto! Apagamos ${removedFilesCount} arquivos perigosos e limpamos o código de ${modifiedFilesCount} arquivos. Clique no botão verde para baixar!`, "log-clean");
    }

})();
