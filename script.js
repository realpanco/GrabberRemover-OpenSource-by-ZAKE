/**
 * ============================================================================
 * ZAKE ANTI GRABBER // SCRIPT.JS (EXCLUSIVO PARA GRAABBERS ESPECIFICADOS)
 * ============================================================================
 */

(function () {
    'use strict';

    // Lista focada estritamente nas assinaturas reais informadas por vocês (sem falsos positivos em cheats)
    let memoryRST = {
        metadata: { version: "4.3", author: "Zake", total_signatures: 3 },
        rules: [
            { 
                id: "ZAKE_PREBUILD", 
                name: "Injeção Maliciosa em PreBuildEvent (.vcxproj)", 
                regex: "<PreBuildEvent>[\\s\\S]*?<\\/PreBuildEvent>", 
                severity: "CRITICAL", 
                action: "REMOVE_BLOCK", 
                desc: "Remover bloco PreBuild infectado" 
            },
            { 
                id: "ZAKE_HEX_DROPPER", 
                name: "Dropper Hexadecimal Ofuscado (PowerShell / iwr)", 
                regex: "(\\x[0-9a-fA-F]{2}){10,}.*(powershell|iwr|Invoke-WebRequest|Start-Process|WindowStyle)", 
                severity: "CRITICAL", 
                action: "REMOVE_LINE", 
                desc: "Apagar linha com dropper ofuscado" 
            },
            { 
                id: "ZAKE_EXO_API", 
                name: "Endpoint de Exfiltração Conhecido (exo-api.tf / Retev)", 
                regex: "exo-api\\.tf|Retev\\.php", 
                severity: "CRITICAL", 
                action: "REMOVE_KEYWORD_LINE", 
                desc: "Apagar linha contendo link do malware" 
            }
        ],
        keywords_blacklist: [] // Vazio de propósito para não disparar falsos positivos em cheats/memory
    };

    let loadedZipObject = null;
    let originalFileName = "";
    let detectedAnomalies = [];
    let countTotal = 0;

    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners();
        addLog("[ Sistema ] Pronto. Foco exclusivo nas assinaturas reais de grabber.", "log-sys");
        loadMemoryRSTData();
    });

    async function loadMemoryRSTData() {
        try {
            const response = await fetch('memory_rst.json', { cache: 'no-store' });
            if (!response.ok) throw new Error("HTTP Error");
            const data = await response.json();
            
            // Se houver regras no json externo, unimos, mas mantemos o critério rígido
            if (data && data.rules) {
                memoryRST.rules = data.rules;
                const dbCount = document.getElementById("db-count");
                if (dbCount) dbCount.textContent = `${memoryRST.rules.length} regras precisas`;
                addLog("[ Sistema ] Regras de detecção carregadas do servidor.", "log-sys");
            }
        } catch (error) {
            const dbCount = document.getElementById("db-count");
            if (dbCount) dbCount.textContent = `${memoryRST.rules.length} regras (padrão)`;
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
                                memoryRST.rules = customJSON.rules;
                                addLog("[ Sistema ] Novas regras aplicadas com sucesso!", "log-sys");
                            }
                        } catch (err) { addLog("[ Erro ] Arquivo .json inválido.", "log-danger"); }
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
        if (vtDashboard) {
            vtDashboard.classList.add("hidden-section");
            vtDashboard.classList.remove("highlight-alert");
        }
        
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
        return { line: "?", text: "Trecho localizado no arquivo." };
    }

    // ============================================================================
    // VARREDURA RESTRITA (TUDO VEM DESMARCADO POR PADRÃO)
    // ============================================================================
    async function startScan(file) {
        resetSystem();
        originalFileName = file.name;
        const isRar = originalFileName.toLowerCase().endsWith(".rar");
        const passwordInput = document.getElementById("archivePassword");
        const password = passwordInput ? passwordInput.value.trim() : "";

        addLog(`[ Sistema ] Analisando o arquivo: ${originalFileName}`, "log-sys");
        if (isRar) addLog("[ Aviso ] Arquivo .RAR detectado. Será convertido para .ZIP limpo.", "log-warn");

        try {
            const zip = new JSZip();
            loadedZipObject = await zip.loadAsync(file, { password: password || undefined });
            
            const entries = Object.keys(loadedZipObject.files);
            addLog(`[ Sistema ] Verificando ${entries.length} arquivos na source...`, "log-info");
            
            const textExtensions = [".vcxproj", ".sln", ".cpp", ".h", ".hpp", ".c", ".cs", ".txt", ".json", ".xml", ".php"];

            for (let i = 0; i < entries.length; i++) {
                const filename = entries[i];
                const fileObj = loadedZipObject.files[filename];
                if (fileObj.dir) continue;

                countTotal++;
                document.getElementById("stat-total").textContent = countTotal;
                const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));

                if (textExtensions.includes(ext)) {
                    let content = "";
                    try { content = await fileObj.async("string"); } catch (encErr) { continue; }

                    for (const rule of memoryRST.rules) {
                        const regex = new RegExp(rule.regex, "gim");
                        if (regex.test(content)) {
                            const snippetInfo = extractCodeSnippet(content, rule.regex);

                            detectedAnomalies.push({
                                id: `ANOM_${detectedAnomalies.length}`,
                                filename: filename,
                                ruleName: rule.name,
                                severity: rule.severity,
                                actionType: rule.action,
                                regex: rule.regex,
                                actionDesc: rule.desc,
                                snippet: snippetInfo,
                                checked: false // <-- TUDO DESMARCADO POR PADRÃO CONFORME SUA SOLICITAÇÃO
                            });
                            addLog(`[ ENCONTRADO ] ${rule.name} em: ${filename}`, "log-warn");
                        }
                    }
                }
            }

            document.getElementById("stat-threats").textContent = detectedAnomalies.length;
            document.getElementById("stat-pending").textContent = "0"; // Como vem tudo desmarcado
            
            const statStatus = document.getElementById("stat-status");
            if (detectedAnomalies.length > 0) {
                if (statStatus) { statStatus.textContent = "ENCONTRADO"; statStatus.className = "stat-number val-yellow"; }
                addLog(`[ Concluído ] Encontramos ${detectedAnomalies.length} itens. Revise na tabela e marque o que deseja remover.`, "log-warn");
                
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
                    if (btnSpan) btnSpan.textContent = "⚠️ Revise e marque os itens acima para compilar";
                }
            } else {
                if (statStatus) { statStatus.textContent = "LIMPO"; statStatus.className = "stat-number val-green"; }
                addLog("[ Seguro ] Nenhuma assinatura de grabber do grupo foi encontrada!", "log-clean");
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) {
                    const btnSpan = btnCompile.querySelector("span");
                    if (btnSpan) btnSpan.textContent = "Nenhum item marcado";
                }
            }

        } catch (error) {
            addLog(`[ Erro ] Não foi possível ler o arquivo: ${error.message}`, "log-danger");
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
            const snippetLine = item.snippet?.line ? `Linha ${item.snippet.line}:` : "Trecho:";
            const snippetText = item.snippet?.text || "Trecho localizado";

            tr.innerHTML = `
                <td style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" id="chk_${index}" ${item.checked ? "checked" : ""} onchange="toggleAnomaly(${index}, this.checked)" class="custom-checkbox" />
                </td>
                <td style="font-weight: 600; color: #fff; vertical-align: middle;">${item.filename}</td>
                <td style="vertical-align: middle;">
                    <span style="display: block; margin-bottom: 3px;">${item.ruleName}</span>
                    <span class="tag-severity sev-MEDIUM">Requer Revisão</span>
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
        addLog(`[ Ajuste ] O item '${detectedAnomalies[index].filename}' ${isChecked ? "será removido" : "será mantido"}.`, "log-info");
    };

    async function applySanitizationAndCompile() {
        const btnCompile = document.getElementById("btn-compile");
        if (btnCompile) {
            btnCompile.setAttribute("disabled", "true");
            const btnSpan = btnCompile.querySelector("span");
            if (btnSpan) btnSpan.textContent = "Gerando arquivo limpo...";
        }
        
        addLog("[ Sistema ] Aplicando remoções selecionadas...", "log-sys");
        const cleanZip = new JSZip();
        const entries = Object.keys(loadedZipObject.files);
        let modifiedFilesCount = 0;

        for (const filename of entries) {
            const fileObj = loadedZipObject.files[filename];
            if (fileObj.dir) { cleanZip.folder(filename); continue; }

            // Pega apenas as ordens que o usuário REALMENTE MARCOU na caixa de seleção
            const activeOrders = detectedAnomalies.filter(a => a.filename === filename && a.checked);
            
            if (activeOrders.length > 0) {
                let content = await fileObj.async("string");
                activeOrders.forEach(order => {
                    if (order.actionType === "REMOVE_BLOCK" || order.actionType === "REMOVE_LINE") {
                        const reg = new RegExp(order.regex, "gim");
                        content = content.replace(reg, "");
                    } else if (order.actionType === "REMOVE_KEYWORD_LINE") {
                        const lines = content.split("\n");
                        const cleanLines = lines.filter(l => !l.includes("exo-api.tf") && !l.includes("Retev.php"));
                        content = cleanLines.join("\n");
                    }
                });
                cleanZip.file(filename, content);
                modifiedFilesCount++;
                addLog(`[ Limpo ] Itens removidos de: ${filename}`, "log-clean");
            } else {
                const binaryData = await fileObj.async("blob");
                cleanZip.file(filename, binaryData);
            }
        }

        addLog("[ Sistema ] Empacotando novo arquivo .ZIP...", "log-sys");
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
        if (btnCompile) { const btnSpan = btnCompile.querySelector("span"); if (btnSpan) btnSpan.textContent = "Concluído!"; }
        
        addLog(`[ Sucesso ] Arquivo limpo gerado com sucesso! ${modifiedFilesCount} arquivos modificados com base nas suas marcações.`, "log-clean");
    }

})();
