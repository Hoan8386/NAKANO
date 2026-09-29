/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham			    Init, create file
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 
        '../cons/scv_cons_file.js',
    ], (query,
        constFile,
    ) => {
        
        const onRequest = scriptContext => {
            let params = scriptContext.request.parameters;
            let response = scriptContext.response;
            
            try{
                if(params.printFileScript){
                    let contensScript = getUrlScript(params.printFileScript).join("\n");
                    
                    let dataSource = printDataSource(params);
                    response.write(`
                        <script>let printDataSource = ${JSON.stringify(dataSource)};</script>
                        ${contensScript}
                    `
                );
                    return;
                }
                let pdfFile = printPdf(params);
            
                response.writeFile(pdfFile, true)
            }
            catch(err){
                log.error("Error: Try.catch", err);

                response.write(JSON.stringify({
                    success: false,
                    message: err.message
                }));

            }
        }

        const printPdf = (_params) => {
            let pdfFile = null;

            let pathScriptPrint = constFile.getCurrentRootFolder() + `/print/${_params.printFile}.js`;

            require([pathScriptPrint], function (modulePrint)
            {
                pdfFile = modulePrint.generateFilePDF(_params);
            });

            return pdfFile;
        }

        const printDataSource = (_params) => {
            let pdfFile = null;

            let pathScriptPrint = constFile.getCurrentRootFolder() + `/print/${_params.printFile}.js`;

            require([pathScriptPrint], function (modulePrint)
            {
                pdfFile = modulePrint.getDataSource(_params);
            });

            return pdfFile;
        }

        const getUrlScript = (_printFileScript) =>{
            let arrFilePath = [
                '../scripts/scv_exceljs.js',
                '../olib/alasql/alasql.min@4.6.6.js',
                '../olib/exceljs.min@4.4.0.js',
                '../olib/FileSaver.min@2.0.5.js',
                '../print/scripts/' + _printFileScript + ".js",
            ];
            let arrFileName  = arrFilePath.map(e => e.split("/").pop());
            let arrResult = [];

            let arrUrlFile = query.runSuiteQL({
                query: `SELECT DISTINCT a.name, a.url, a.filetype, b.name as folder_name
                FROM file a,
                    (SELECT id, name, appfolder
                        FROM MediaItemFolder
                        START WITH appfolder = '${constFile.getCurrentAppFolder()}'
                        CONNECT BY PRIOR id = parent) b
                WHERE a.folder = b.id
                    AND a.isinactive = 'F'
                    AND a.name IN ('${arrFileName.join("', '")}')
            `}).asMappedResults();
            
            let resultOfPrintFileScript = "";

            for(let i = 0; i < arrUrlFile.length; i++){
                let objFile = arrUrlFile[i];

                let idxFileName = arrFilePath.findIndex(_pathFile => _pathFile.indexOf(`/${objFile.folder_name}/${objFile.name}`) > -1);
                if(idxFileName == -1) continue;

                if(idxFileName === (arrFilePath.length - 1)){
                    resultOfPrintFileScript = `<script type="text/javascript" src="${objFile.url}"></script>`;
                    continue;
                }

                arrResult.push(`<script type="text/javascript" src="${objFile.url}"></script>`);
            }

            arrResult.push(resultOfPrintFileScript);

            return arrResult;
        }

        return {
            onRequest,
            printPdf
        }
    }
);