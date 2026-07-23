/**
 * ============================================================================
 * ZAKE ANTI GRABBER // SCRIPT.JS (EXCLUSIVO PARA AS REGRAS ORIGINAIS)
 * ============================================================================
 */

(function () {
    'use strict';

    // Regras restritas unicamente aos pontos citados na instrução original
    let memoryRST = {
        rules: [
            {
                id: "RULE_PREBUILD",
                name: "Injeção de PreBuildEvent no projeto (.vcxproj)",
                regex: "<PreBuildEvent>[\\s\\S]*?<\\/PreBuildEvent>",
                severity: "CRITICAL",
                action: "REMOVE_BLOCK",
                desc: "Apagar o bloco <PreBuildEvent> inteiro"
            },
            {
                id: "RULE_STRING_MALICIOSA",
                name: "String maliciosa / Token de Injeção",
                regex: "Fwfkuuv157wg2gjthwla0lwbo1493h7",
                severity: "CRITICAL",
                action: "REMOVE_LINE",
                desc: "Apagar as linhas contendo a string"
            },
            {
                id: "RULE_DROPPER_URL",
                name: "Endereço de Download do Dropper (exo-api.tf)",
                regex: "exo-api\\.tf|Retev\\.php",
                severity: "CRITICAL",
                action: "REMOVE_LINE",
                desc: "Apagar linha com o link malicioso"
            }
        ],
        keywords_blacklist: [
            "Fwfkuuv157wg2gjthwla0lwbo1493h7",
            "exo-api.tf",
            "Retev.php"
        ]
    };

    let loadedZipObject = null;
    let originalFileName = "";
    let detectedAnomalies = [];
    let countTotal = 0;

    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners();
        addLog("[ Sistema ] Pronto. O scanner está configurado para procurar apenas as assinaturas exatas do guia.", "log-sys");
        loadMemoryRSTData();
    });

    async function loadMemoryRSTData() {
        try {
            const response = await fetch('memory_rst.json', { cache: 'no-store' });
            if (!response.ok) throw new Error("HTTP Error");
            const data = await response.json();
            
            // Se houver regras no json externo, unimos às nossas regras exatas
            if (data && data.rules) {
                memoryRST.rules = data.rules;
            }
            const dbCount = document.getElementById("db-count");
            if (dbCount) dbCount.textContent = `${memoryRST.rules.length} regras exatas ativas`;
            addLog("[ Sistema ] Regras de varredura carregadas com sucesso.", "log-sys");
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
                                addLog("[ Sistema ] Novas regras personalizadas aplicadas!", "log-sys");
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
        return { line: "Bloco", text: "Trecho infectado detectado no arquivo." };
    }

    // ============================================================================
    // MOTOR DE VARREDURA EXCLUSIVO PARA AS REGRAS CITADAS
    // ============================================================================
    async function startScan(file) {
        resetSystem();
        originalFileName = file.name;
        const isRar = originalFileName.toLowerCase().endsWith(".rar");
        const passwordInput = document.getElementById("archivePassword");
        const password = passwordInput ? passwordInput.value.trim() : "";

        addLog(`[ Sistema ] Analisando o arquivo: ${originalFileName}`, "log-sys");
        if (isRar) addLog("[ Aviso ] Arquivo .RAR detectado. Ele será convertido para .ZIP limpo após a varredura.", "log-warn");
        if (password) addLog("[ Sistema ] Usando a senha informada para abrir o arquivo...", "log-sys");

        try {
            const zip = new JSZip();
            loadedZipObject = await zip.loadAsync(file, { password: password || undefined });
            
            const entries = Object.keys(loadedZipObject.files);
            addLog(`[ Sistema ] Verificando ${entries.length} arquivos em busca das assinaturas originais...`, "log-info");
            
            const bannedExtensions = [".exe", ".scr", ".vbs", ".bat", ".cmd", ".ps1", ".pif"];
            const textExtensions = [".vcxproj", ".sln", ".cpp", ".h", ".hpp", ".c", ".cs", ".js", ".ts", ".py", ".txt", ".json", ".xml", ".html", ".css", ".md", ".ini", ".php"];

            for (let i = 0; i < entries.length; i++) {
                const filename = entries[i];
                const fileObj = loadedZipObject.files[filename];
                if (fileObj.dir) continue;

                countTotal++;
                document.getElementById("stat-total").textContent = countTotal;
                const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));

                // 1. Executáveis soltos suspeitos (conforme seu guia: exe de poucos bytes em appdata/temp)
                if (bannedExtensions.includes(ext)) {
                    detectedAnomalies.push({
                        id: `ANOM_${detectedAnomalies.length}`,
                        filename: filename,
                        ruleName: "Executável suspeito encontrado (Dropper/EXE)",
                        severity: "CRITICAL",
                        actionType: "DELETE_FILE",
                        actionDesc: "Excluir arquivo",
                        snippet: { line: "Binário", text: "Arquivo executável solto no pacote (.exe)" },
                        checked: true
                    });
                    addLog(`[ PERIGO ] Arquivo executável encontrado: ${filename}`, "log-danger");
                    continue;
                }

                // 2. Varredura textual estrita baseada nas regras informadas
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
                                checked: true // Marcado por ser uma assinatura exata confirmada
                            });
                            addLog(`[ PERIGO ] Assinatura exata (${rule.name}) encontrada em: ${filename}`, "log-danger");
                        }
                    }
                }
            }

            document.getElementById("stat-threats").textContent = detectedAnomalies.length;
            const initialCheckedCount = detectedAnomalies.filter(a => a.checked).length;
            document.getElementById("stat-pending").textContent = initialCheckedCount;
            
            const statStatus = document.getElementById("stat-status");
            if (detectedAnomalies.length > 0) {
                if (statStatus) { statStatus.textContent = "INFECTADO"; statStatus.className = "stat-number val-red"; }
                addLog(`[ Concluído ] Encontramos ${detectedAnomalies.length} infecções exatas do guia!`, "log-warn");
                
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
                    if (btnSpan) btnSpan.textContent = "⚠️ Revise as marcações acima antes de compilar";
                }
            } else {
                if (statStatus) { statStatus.textContent = "LIMPO"; statStatus.className = "stat-number val-green"; }
                addLog("[ Seguro ] Nenhuma das assinaturas citadas no seu guia foi encontrada!", "log-clean");
                const btnCompile = document.getElementById("btn-compile");
                if (btnCompile) {
                    const btnSpan = btnCompile.querySelector("span");
                    if (btnSpan) btnSpan.textContent = "O arquivo já está seguro!";
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
        if (vtSummary) vtSummary.textContent = `${detectedAnomalies.length} Ameaças`;
        const vtDashboard = document.getElementById("vt-dashboard");
        if (vtDashboard) vtDashboard.classList.remove("hidden-section");

        detectedAnomalies.forEach((item, index) => {
            const tr = document.createElement("tr");
            let sevText = "Crítico";
            let sevClass = "sev-CRITICAL";

            const snippetLine = item.snippet?.line ? `Linha ${item.snippet.line}:` : "Trecho:";
            const snippetText = item.snippet?.text || "Bloco malicioso detectado";

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
        addLog(`[ Ajuste ] O arquivo '${detectedAnomalies[index].filename}' ${isChecked ? "será limpo" : "será mantido como está"}.`, "log-info");
    };

    // LIMPEZA E COMPILAÇÃO (APLICANDO AS REGRAS DO GUIA ORIGINAL)
    async function applySanitizationAndCompile() {
        const btnCompile = document.getElementById("btn-compile");
        if (btnCompile) {
            btnCompile.setAttribute("disabled", "true");
            const btnSpan = btnCompile.querySelector("span");
            if (btnSpan) btnSpan.textContent = "Limpando e criando arquivo...";
        }
        
        addLog("[ Sistema ] Aplicando as regras de remoção do guia...", "log-sys");
        const cleanZip = new JSZip();
        const entries = Object.keys(loadedZipObject.files);
        let removedFilesCount = 0;
        let modifiedFilesCount = 0;

        for (const filename of entries) {
            const fileObj = loadedZipObject.files[filename];
            if (fileObj.dir) { cleanZip.folder(filename); continue; }

            // Se for arquivo .sln e o usuário marcou para limpar a source, podemos apagar o .sln conforme o guia diz: "Primeiro apague o arquivo .sln"
            if (filename.toLowerCase().endsWith(".sln")) {
                const hasInfectedVcxproj = detectedAnomalies.some(a => a.checked);
                if (hasInfectedVcxproj) {
                    addLog(`[ Guia ] Arquivo .sln antigo ignorado/apagado para ser recriado: ${filename}`, "log-warn");
                    continue; // Pula o .sln antigo para forçar o usuário a abrir no Visual Studio e gerar um novo conforme o passo a passo
                }
            }

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
                    if (order.actionType === "REMOVE_BLOCK") {
                        // Remove tudo entre <PreBuildEvent> e </PreBuildEvent>
                        const reg = new RegExp(order.regex, "gim");
                        content = content.replace(reg, "");
                    } else if (order.actionType === "REMOVE_LINE") {
                        // Remove a linha inteira onde a string maliciosa está presente
                        const lines = content.split("\n");
                        const cleanLines = lines.filter(l => !l.includes(order.regex) && !l.includes("Fwfkuuv157wg2gjthwla0lwbo1493h7") && !l.includes("exo-api.tf"));
                        content = cleanLines.join("\n");
                    }
                });
                cleanZip.file(filename, content);
                modifiedFilesCount++;
                addLog(`[ Limpo ] Assinatura removida de dentro de: ${filename}`, "log-clean");
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
        
        addLog(`[ Sucesso ] Pronto! Siga o restante do guia (abra o .vcxproj no Visual Studio e salve um novo .sln). Clique no botão verde para baixar!`, "log-clean");
    }

})();
