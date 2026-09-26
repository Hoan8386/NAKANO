/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Huy Pham			    Init, create file, Setup Extension Form, from ms.Ngọc(https://app.clickup.com/t/3773072/14yhnhmfu6k)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/query',
    '../cons/scv_cons_file.js',
],

    (query,
        constFile,
    ) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let step_log = "";
            try{

                let recType = scriptContext.newRecord.type;

                let objSetupExtenseForm = getDataSetupExtenseForm(recType);
                if(!objSetupExtenseForm) return;

                step_log = "addScriptExtenseForm";
                addScriptExtenseForm(scriptContext, objSetupExtenseForm);
            }
            catch(err){
                log.error("ERROR: TRY-CATCH: " + scriptContext.newRecord.type + " - " + step_log, err);
            }
            
        };

        const getDataSetupExtenseForm = (_recType) => {
            if(!_recType) return null;

            let arrResult = query.runSuiteQL({
                query: `SELECT a.id, a.name,
                    b.id as ext_detail_id,
                    b.custrecord_scv_ext,
                    b.custrecord_scv_ext_d_action,
                    b.custrecord_scv_ext_d_fieldid,
                    b.custrecord_scv_ext_d_sublistid,
                    b.custrecord_scv_ext_d_description,
                    b.custrecord_scv_ext_d_condition
                FROM customrecord_scv_extense a,
                    customrecord_scv_ext_detail b
                WHERE a.isinactive = 'F' AND b.isinactive(+) = 'F'
                    AND a.id = b.custrecord_scv_ext(+)
                    AND a.custrecord_scv_ext_rectype = '${_recType}'
                `
            }).asMappedResults();

            let objRes = null;
            if(arrResult.length > 0){
                objRes = {
                    id: arrResult[0].id,
                    name: arrResult[0].name,
                    type: _recType,
                    serviceScript: "/app/site/hosting/scriptlet.nl?script=customscript_scv_sl_extense_form_svc&deploy=customdeploy_scv_sl_extense_form_svc",
                    detail: []
                };

                let arrScriptIdOfField = [];

                for(let i = 0; i < arrResult.length; i++){
                    let objResDetail = arrResult[i];

                    objRes.detail.push({
                        id: objResDetail.ext_detail_id,
                        custrecord_scv_ext: objResDetail.custrecord_scv_ext,
                        custrecord_scv_ext_d_action: objResDetail.custrecord_scv_ext_d_action,
                        custrecord_scv_ext_d_fieldid: objResDetail.custrecord_scv_ext_d_fieldid,
                        custrecord_scv_ext_d_fieldid_id: objResDetail.custrecord_scv_ext_d_fieldid,
                        custrecord_scv_ext_d_sublistid: objResDetail.custrecord_scv_ext_d_sublistid,
                        custrecord_scv_ext_d_description: htmlDecode(objResDetail.custrecord_scv_ext_d_description || ""),
                        custrecord_scv_ext_d_condition: htmlDecode(objResDetail.custrecord_scv_ext_d_condition || ""),
                    });
                }

                initCustomField(objRes);
            }
            return objRes;
        }

        const addScriptExtenseForm = (scriptContext, _objSetupExtenseForm) => {
            let arrFileName = ['scv_extense_form.js'];

            let arrResult = query.runSuiteQL({
                query: `SELECT DISTINCT a.name, a.url, a.filetype, b.name as folder_name
                FROM file a,
                    (SELECT id, name, appfolder
                        FROM MediaItemFolder
                        START WITH appfolder = '${constFile.getCurrentAppFolder()}'
                        CONNECT BY PRIOR id = parent) b
                WHERE a.folder = b.id
                    AND a.isinactive = 'F'
                    AND a.name IN ('${arrFileName.join("', '")}')
                `
            }).asMappedResults();

            let contentHtml = `<script type="application/json" id="scv_extense_form_data_init">${JSON.stringify(_objSetupExtenseForm)}</script>\n`;

            arrResult.forEach(fileData => {
                if(fileData.filetype == 'STYLESHEET'){
                    contentHtml += `<link rel="stylesheet" type="text/css" href="${fileData.url}"/>\n`;
                }
                else{
                    contentHtml += `<script type="text/javascript" src="${fileData.url}"></script>\n`;
                }
            });
            
            scriptContext.form.addField({
                id : "custpage_scv_ext_form_script", label : "Script Extense Form",
                type : "inlinehtml",
            }).defaultValue = contentHtml;
        }

        const initCustomField = (objResExt) =>{
            if(!objResExt || objResExt.type.indexOf("customrecord") == -1) return;

            let arrLineDetail = objResExt.detail.filter(e => e.custrecord_scv_ext_d_action == 9);
            if(arrLineDetail.length == 0) return;
            
            let arrFieldId = arrLineDetail.filter(e => !!e.custrecord_scv_ext_d_fieldid).map(e => e.custrecord_scv_ext_d_fieldid);

            let arrCustomField = getDataCustomField(arrFieldId);

            arrLineDetail.forEach(objLineDetail =>{
                let objField = arrCustomField.find(e => e.scriptid == objLineDetail.custrecord_scv_ext_d_fieldid);
                if(!!objField){
                    objLineDetail.custrecord_scv_ext_d_fieldid_id = objField.id;
                }
            });
        }

        const getDataCustomField = (_arrScriptId) =>{
            let arrResult = query.runSuiteQL({
                query: `SELECT id, name, LOWER(scriptid) as scriptid 
                FROM CustomField 
                where scriptid IN (${_arrScriptId.map(id => `'${id.toUpperCase()}'`).join(", ")})
                `
            }).asMappedResults();

            return arrResult;
        }

        const htmlDecode = (str) => {
            return str
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }
        return {beforeLoad}

    });
