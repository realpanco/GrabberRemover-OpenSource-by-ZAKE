/**
 * ============================================================================
 * ZAKE ANTI GRABBER // SCRIPT.JS (EXCLUSIVO PARA CHEATS & MEMORY SOURCES)
 * ============================================================================
 */

(function () {
    'use strict';

    let memoryRST = {
        metadata: { version: "4.3", author: "Zake", total_signatures: 0 },
        whitelisted_contexts: [
            "require('discord.js')", "require(\"discord.js\")", "import discord", 
            "from discord", "discord.Client", "discord.WebhookClient", "https://discord.gg/",
            "ImGui::Text", "ImGui::Button", "ImGui_ImplDX12_", "ImGui_ImplDX9_", 
            "ImGui_ImplWin32_", "CreateDeviceD3D", "CleanupDeviceD3D", "LRESULT WINAPI"
        ],
        rules: [
            // ESTES SÃO OS ÚNICOS QUE PODEM VIR MARCADOS (100% O GRABBER ESPECÍFICO DO CASO)
            { id: "RST_001", name: "Injeção PreBuild maliciosa (Dropper no .vcxproj)", regex: "<PreBuildEvent>[\\s\\S]*?(powershell|iwr|Invoke-WebRequest|DownloadString|exo-api)[\\s\\S]*?<\\/PreBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado com dropper", autoCheck: true },
            { id: "RST_002", name: "Injeção PostBuild maliciosa", regex: "<PostBuildEvent>[\\s\\S]*?(powershell|iwr|Invoke-WebRequest|DownloadString|exo-api)[\\s\\S]*?<\\/PostBuildEvent>", severity: "CRITICAL", action: "REMOVE_BLOCK", desc: "Remover bloco infectado", autoCheck: true },
            { id: "RST_003", name: "String maliciosa específica do ImGui (Fwfkuuv... / Retev.php)", regex: "(Fwfkuuv[a-zA-Z0-9]+|exo-api\\.tf|Retev\\.php)", severity: "CRITICAL", action: "REMOVE_LINE", desc: "Apagar linha com o token do grabber", autoCheck: true },
            
            // TODO O RESTO ABAIXO SERVE APENAS DE AVISO E VEM SEMPRE DESMARCADO PARA NÃO QUEBRAR CHEATS
            { id: "RST_004", name: "Tag PreBuild genérica (Revisar se é do projeto)", regex: "<PreBuildEvent>[\\s\\S]*?<\\/PreBuildEvent>", severity: "MEDIUM", action: "REMOVE_BLOCK", desc: "Remover bloco PreBuild", autoCheck: false },
            { id: "RST_005", name: "Comando genérico do PowerShell", regex: "^.*(powershell|iwr|Invoke-WebRequest).*$", severity: "MEDIUM", action: "REMOVE_LINE", desc: "Apagar linha de script", autoCheck: false },
            { id: "RST_006", name: "Webhook do Discord externo", regex: "https?:\\/\\/(ptb\\.|canary\\.)?discord(app)?\\.com\\/api\\/webhooks\\/[0-9]+\\/[a-zA-Z0-9_-]+", severity: "HIGH", action: "REPLACE_NULL", desc: "Destruir link do Webhook", autoCheck: false }
        ],
        keywords_blacklist: [
            "Fwfkuuv157wg2gjthwla0lwbo1493h7", "exo-api.tf", "Retev.php", "BK291834.exe", "Berok.exe",
            "AoMiRfxV.vbs", "g2Yiw4NcWwed", "GetChunk", "AppendChunk", "Scripting.FileSystemObject"
        ]
    };

    let loadedZipObject = null;
    let originalFileName = "";
    let detectedAnomalies = [];
    let countTotal = 0;

    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners();
        addLog("[ Sistema ] Pronto. Modo de segurança para sources de cheat ativado (tudo vem desmarcado por padrão).", "log-sys");
        loadMemoryRSTData();
    });

    async function loadMemoryRSTData() {
        try {
            const response = await fetch('memory_rst.json', { cache: 'no-store' });
            if (!response.ok) throw new Error("HTTP Error");
            const data = await response.json();
            
            if (data && data.rules && data.keywords_blacklist) {
                // Mantém apenas regras seguras e garante que heurísticas genéricas venham com autoCheck: false
                data.rules.forEach(r => {
                    if (!r.autoCheck) r.autoCheck = false;
                });
                memoryRST = data;
                const total = (memoryRST.rules.length || 0) + (memoryRST.keywords_blacklist.length || 0);
                const dbCount = document.getElementById("db-count");
                if (dbCount) dbCount.textContent = `${total} assinaturas`;
                addLog(`[ Sistema ] Base de dados carregada (${total} regras).`, "log-sys");
            }
        } catch (error) {
            const total = (memoryRST.rules?.length || 0);
            const dbCount = document.getElementById("db-count");
            if (dbCount) dbCount.textContent = `${total} regras (padrão)`;
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
                            if (customJSON.rules) {
                                customJSON.rules.forEach(r => { if (r.autoCheck === undefined) r.autoCheck = false; });
                                memoryRST = customJSON;
                                addLog("[ Sistema ] Nova lista de regras aplicada!", "log-sys");
                            }
                        } catch (err) { addLog("[ Erro ] JSON inválido.", "log-danger"); }
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
        if (terminal) { terminal.innerHTML = ""; addLog("[ Sistema ] Avisos limpos.", "log-sys"); }
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
        if (vtDashboard) { vtDashboard.classList.add("hidden-section"); vtDashboard.classList.remove("highlight-alert"); }
        
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

    function extractCodeSnippet(content, patternMatch) {
        const lines = content.split(/\r?\n/);
        for (let idx = 0; idx < lines.length; idx++) {
            if (lines[idx].includes(patternMatch) || new RegExp(patternMatch, "i").test(lines[idx])) {
                const lineNumber = idx + 1;
                const snippetText = lines[idx].trim();
                return {
                    line: lineNumber,
                    text: snippetText.length > 80 ? snippetText.substring(0, 80) + "..." : snippetText
                };
            }
        }
        return { line: "?", text: "Trecho encontrado em bloco ou arquivo." };
    }

    async function startScan(file) {
        resetSystem();
        originalFileName = file.name;
        const isRar = originalFileName.toLowerCase().endsWith(".rar");
        const passwordInput = document.getElementById("archivePassword");
        const password = passwordInput ? passwordInput.value.trim() : "";

        addLog(`[ Sistema ] Analisando o arquivo: ${originalFileName}`, "log-sys");
        if (isRar) addLog("[ Aviso ] Arquivo .RAR detectado. Será convertido para .ZIP limpo.", "log-warn");
        if (password) addLog("[ Sistema ] Usando senha informada...", "log-sys");

        try {
            const zip = new JSZip();
            loadedZipObject = await zip.loadAsync(file, { password: password || undefined });
            
            const entries = Object.keys(loadedZipObject.files);
            addLog(`[ Sistema ] Verificando ${entries.length} itens (injeções de memória e DLLs ignoradas por segurança)...`, "log-info");
            
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

                // Executáveis soltos perigosos (.exe fora do padrão de cheat) -> Crítico, mas se for .exe comum de loader/cheat, deixamos desmarcado por segurança, exceto se for explicitamente o grabber
                if (bannedExtensions.includes(ext)) {
                    detectedAnomalies.push({
                        id: `ANOM_${detectedAnomalies.length}`,
                        filename: filename,
                        ruleName: "Executável suspeito encontrado",
                        severity: "HIGH",
                        actionType: "DELETE_FILE",
                        actionDesc: "Excluir arquivo",
                        snippet: { line: "Binário", text: "Arquivo executável solto" },
                        checked: false // DESMARCADO POR PADRÃO PARA NÃO QUEBRAR LOADERS
                    });
                    addLog(`[ Aviso ] Arquivo executável encontrado (veja se não é seu loader): ${filename}`, "log-warn");
                    continue;
                }

                if (textExtensions.includes(ext)) {
                    let content = "";
                    try { content = await fileObj.async("string"); } catch (encErr) { continue; }

                    // Regras
                    for (const rule of memoryRST.rules) {
                        const regex = new RegExp(rule.regex, "gim");
                        if (regex.test(content)) {
                            const snippetInfo = extractCodeSnippet(content, rule.regex);
                            
                            // SÓ MARCA SE FOR O GRABBER EXATO DO PRIMEIRO PROMPT (autoCheck: true)
                            // Todo o resto vem estritamente false para não quebrar memory/cheats
                            const shouldCheck = rule.autoCheck === true;

                            detectedAnomalies.push({
                                id: `ANOM_${detectedAnomalies.length}`,
                                filename: filename,
                                ruleName: rule.name,
                                severity: rule.severity,
                                actionType: rule.action,
                                regex: rule.regex,
                                actionDesc: rule.desc || "Apagar código",
                                snippet: snippetInfo,
                                checked: shouldCheck 
                            });
                            
                            if (shouldCheck) {
                                addLog(`[ GRABBER CONFIRMADO ] ${rule.name} em: ${filename}`, "log-danger");
                            } else {
                                addLog(`[ Aviso genérico ] ${rule.name} em: ${filename} (Desmarcado por segurança)`, "log-warn");
                            }
                        }
                    }

                    // Keywords da blacklist (Sempre desmarcadas por padrão para proteger funções de memória/cheats)
                    for (const kw of (memoryRST.keywords_blacklist || [])) {
                        if (content.includes(kw)) {
                            const snippetInfo = extractCodeSnippet(content, kw);
                            detectedAnomalies.push({
                                id: `ANOM_${detectedAnomalies.length}`,
                                filename: filename,
                                ruleName: `Termo suspeito ('${kw}')`,
                                severity: "HIGH",
                                actionType: "REMOVE_KEYWORD_LINE",
                                keyword: kw,
                                actionDesc: "Apagar linha",
                                snippet: snippetInfo,
                                checked: false // SEMPRE DESMARCADO POR PADRÃO
                            });
                        }
                    }
                }
            }

            document.getElementById("stat-threats").textContent = detectedAnomalies.length;
            const initialCheckedCount = detectedAnomalies.filter(a => a.checked).length;
            document.getElementById("stat-pending").textContent = initialCheckedCount;
            
            const statStatus = document.getElementById("stat-status");
            if (detectedAnomalies.length > 0) {
                if (statStatus) { statStatus.textContent = "ITENS ENCONTRADOS"; statStatus.className = "stat-number val-yellow"; }
                addLog(`[ Concluído ] ${detectedAnomalies.length} itens encontrados. O que for grabber real do seu grupo veio marcado; o resto está desmarcado para proteger seu cheat.`, "log-warn");
                
                renderVTDashboard();
                const vtDashboard = document.getElementById("vt-dashboard");
                if (vtDashboard) {
                    vtDashboard.classList.add("highlight-alert");
                    setTimeout(() => { vtDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
                }
                
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) {
                    btnCompile.removeAttribute("disabled");
                    const btnSpan = btnCompile.querySelector("span");
                    if (btnSpan) btnSpan.textContent = "⚠️ Revise e clique para limpar";
                }
            } else {
                if (statStatus) { statStatus.textContent = "LIMPO"; statStatus.className = "stat-number val-green"; }
                addLog("[ Seguro ] Nenhum grabber do grupo foi encontrado!", "log-clean");
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) {
                    const btnSpan = btnCompile.querySelector("span");
                    if (btnSpan) btnSpan.textContent = "O arquivo está seguro!";
                }
            }

        } catch (error) {
            addLog(`[ Erro ] Falha ao ler o arquivo: ${error.message}`, "log-danger");
            const statStatus = document.getElementById("stat-status");
            if (statStatus) { statStatus.textContent = "ERRO"; statStatus.className = "stat-number val-red"; }
        }
    }

    function renderVTDashboard() {
        const vtTbody = document.getElementById("vt-tbody");
        if (!vtTbody) return;
        vtTbody.innerHTML = "";
        const vtSummary = document.getElementById("vt-summary");
        if (vtSummary) vtSummary.textContent = `${detectedAnomalies.length} Itens`;
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.remove("hidden-section");

        detectedAnomalies.forEach((item, index) => {
            const tr = document.createElement("tr");
            let sevText = item.checked ? "Confirmado (Marcado)" : "Opcional (Desmarcado)";
            let sevClass = item.checked ? "sev-CRITICAL" : "sev-MEDIUM";

            const snippetLine = item.snippet?.line ? `Linha ${item.snippet.line}:` : "Trecho:";
            const snippetText = item.snippet?.text || "Trecho";

            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" id="chk_${index}" ${item.checked ? "checked" : ""} onchange="toggleAnomaly(${index}, this.checked)" class="custom-checkbox" />
                </td>
                <td style="font-weight: 600; color: #fff; vertical-align: middle;">${item.filename}</td>
                <td style="vertical-align: middle;">
                    <span style="display: block; margin-bottom: 3px;">${item.ruleName}</span>
                    <span class="tag-severity ${sevClass}">${sevText}</span>
                </td>
                <td style="vertical-align: middle;">
                    <div class="code-snippet-box">
                        <span class="code-snippet-line">${snippetLine}</span>
                        <code>${snippetText}</code>
                    </div>
                </td>
                <td style="color: var(--color-yellow); font-weight: 500; vertical-align: middle;">${item.actionDesc}</td>
            `;
            vtTbody.appendChild(tr);
        });
    }

    window.toggleAnomaly = function(index, isChecked) {
        detectedAnomalies[index].checked = isChecked;
        const countChecked = detectedAnomalies.filter(a => a.checked).length;
        document.getElementById("stat-pending").textContent = countChecked;
        addLog(`[ Ajuste ] O item '${detectedAnomalies[index].filename}' ${isChecked ? "será alterado/removido" : "será ignorado (mantido no código)"}.`, "log-info");
    };

    async function applySanitizationAndCompile() {
        const btnCompile = document.getElementById("btn-compile");
        if (btnCompile) {
            btnCompile.setAttribute("disabled", "true");
            const btnSpan = btnCompile.querySelector("span");
            if (btnSpan) btnSpan.textContent = "Gerando arquivo limpo...";
        }
        
        addLog("[ Sistema ] Aplicando limpezas selecionadas...", "log-sys");
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
                addLog(`[ Apagado ] Arquivo excluído: ${filename}`, "log-danger");
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
                        content = content.replace(reg, "https://discord.com/api/webhooks/REMOVIDO");
                    } else if (order.actionType === "REMOVE_KEYWORD_LINE") {
                        const lines = content.split("\n");
                        const cleanLines = lines.filter(l => !l.includes(order.keyword));
                        content = cleanLines.join("\n");
                    }
                });
                cleanZip.file(filename, content);
                modifiedFilesCount++;
                addLog(`[ Limpo ] Modificado com sucesso: ${filename}`, "log-clean");
            } else {
                const binaryData = await fileObj.async("blob");
                cleanZip.file(filename, binaryData);
            }
        }

        addLog("[ Sistema ] Criando pacote final...", "log-sys");
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
        if (statStatus) { statStatus.textContent = "PRONTO"; statStatus.className = "stat-number val-green"; }
        if (btnCompile) { const btnSpan = btnCompile.querySelector("span"); if (btnSpan) btnSpan.textContent = "Pronto para baixar!"; }
        
        addLog(`[ Sucesso ] Arquivo limpo gerado com sucesso!`, "log-clean");
    }

})();
