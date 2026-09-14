/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, WBS import, from ms.Ngọc(https://app.clickup.com/t/3773072/86d453pe8?comment=1300230000018512)
 */
/**
* @NApiVersion 2.1
* @NScriptType ScheduledScript
*/
define(['N/runtime', 
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_queue_job.js',
    '../cons/scv_cons_datastore.js',
    '../common/scv_common_wbs_import.js',
], (runtime, 
    constFormat,
    constQueueJob,
    constDataStore,
    commonWbsImport,
) => {

    const execute = (context) => {
        let curScript = runtime.getCurrentScript();

        let paramsInput = curScript.getParameter({name : "custscript_scv_ss_wbs_import_param"});
            
        paramsInput = !!paramsInput ? JSON.parse(paramsInput) : {};
        
        let objResContents = constDataStore.loadDataStoreFile({
            id: paramsInput.dataFileId,
        });

        let params = objResContents.params;
        let arrLine = objResContents.lines;

        let msg_note = "Start Date: " + constFormat.formatDateTime(new Date());
        msg_note += "\nTotal Line: " + arrLine.length + " (lines)";

        constQueueJob.updateNoteQueueJob(curScript.id, curScript.deploymentId, msg_note);

        try{
            let arrResLines = commonWbsImport.prepareResultLines(params, arrLine);

            let wbsRecId = commonWbsImport.createWbs(params, arrResLines);

            msg_note = "Success: WBS Internal ID: " + wbsRecId;
        }
        catch(err){
            msg_note = "Error: " + (err?.message?.toString() || err?.toString())
        }

        msg_note += "\nEnd Date: " + constFormat.formatDateTime(new Date());

        constQueueJob.completeQueueJob(curScript.id, curScript.deploymentId, msg_note);
    }

    return {
        execute
    };
});