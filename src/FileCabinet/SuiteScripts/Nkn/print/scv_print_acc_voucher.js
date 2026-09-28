/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *   27 Sep 2026         Thanh Hoan              Add button Acc Voucher, trên màn hình project from mrs. Ngoc(https://app.clickup.com/t/3773072/14yhnhmfzpt)
 */
define([
    "N/record", "N/url", 'N/runtime','N/search',
    "../lib/scv_lib_pdf.js",
    '../common/scv_common_ext_performent.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_acc_voucher_print_form.js',
], (
        record, url, runtime,search,
        libPdf,
        commonExtPerformance,

        constFormat,
        constRecord,
        constRole,
        constSubsidiary,
        constSearchAccVoucher,
    ) => {

        const validatePrint = (curRec) =>{

            let arrLine01 = constSearchAccVoucher.getDataSource({
                internalid: curRec.id
            });
            if(arrLine01.length == 0) return false;

            return true;
        }

        const addBtnPrint = (scriptContext, curRec) => {
            if(!validatePrint(curRec)) return null;

            let form = scriptContext.form;
            
            let urlScript = url.resolveScript({
                scriptId: 'customscript_scv_sl_print',
                deploymentId: 'customdeploy_scv_sl_print',
                params: {
                    recordId: curRec.id,
                    recordType: curRec.type,
                    printFile: "scv_print_acc_voucher",
                }
            });

            form.addButton({
                id: "custpage_scv_btn_acc_voucher",
                label: "Acc Voucher",
                functionName: "window.open('" + urlScript + "');"
            });
        };

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_acc_voucher");

            let curRec = record.load({ type: _params.recordType, id: _params.recordId });

            if (!validatePrint(curRec)){
                throw new Error("Không đủ điều kiện để in ấn");
            }

            let renderer = rennderPDF(curRec);

            renderer.addRecord('record', curRec);

            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_acc_voucher");

            return filePDF;
        };

         const rennderPDF = (curRec) =>{ 
            const renderer = libPdf.renderTemplateWithXml("scv_print_acc_voucher"); 
        
            let arrLine01 = constSearchAccVoucher.getDataSource({ 
                internalid: curRec.id 
            }); 
            
            log.error("hoan check" ,arrLine01)
            let objResult = {}; 
            let objLineFirst = arrLine01[0] ?? {}; 
            let objGroup = {}; 
        
            arrLine01.forEach(item => { 
                const entityCode = item.entity_code || ''; 
        
                if (!objGroup[entityCode]) { 
                    objGroup[entityCode] = { 
                        entityCode: item.entity_code || '', 
                        entityName: libPdf.formatDataXML(item.entity_name || ''), 
                        date: item.date || '', 
                        debitLines: [], 
                        creditLines: [], 
                        debitTotal: 0, 
                        creditTotal: 0 
                    }; 
                } 
        
                if ((item.debit_amt || 0) * 1 > 0) {
                    objGroup[entityCode].debitLines.push({
                        account: libPdf.formatDataXML(item.account || ''),
                        description: libPdf.formatDataXML(item.description || ''),
                        projectNo: libPdf.formatDataXML(item.project_no || ''),
                        amount: formatNumberByKey(item.debit_amt),
                        workItem: libPdf.formatDataXML(item.work_item || '')
                    });

                    objGroup[entityCode].debitTotal += (item.debit_amt || 0) * 1;
                }

                if ((item.credit_amt || 0) * 1 > 0) {
                    objGroup[entityCode].creditLines.push({
                        account: libPdf.formatDataXML(item.account || ''),
                        description: libPdf.formatDataXML(item.description || ''),
                        projectNo: libPdf.formatDataXML(item.project_no || ''),
                        amount: formatNumberByKey(item.credit_amt),
                        workItem: libPdf.formatDataXML(item.work_item || '')
                    });

                    objGroup[entityCode].creditTotal += (item.credit_amt || 0) * 1;
                }
            }); 
        
            let arrPage = Object.values(objGroup); 
        
            arrPage.forEach(page => { 
                page.debitTotal = formatNumberByKey(page.debitTotal); 
                page.creditTotal = formatNumberByKey(page.creditTotal); 
            }); 

        
            objResult = { 
                docNum: objLineFirst.doc_num || '', 
                printDate: constFormat.formatDateTime(new Date()),
                pages: arrPage 
            }; 
        
            libPdf.formatDataXMLWithObject(objResult); 
            
            renderer.addCustomDataSource({ 
                format: "OBJECT", 
                alias: 'result', 
                data: objResult 
            }); 
        
            return renderer; 
        }

        
        const formatNumberByKey = (_number) =>{
            return constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { addBtnPrint, generateFilePDF };
    });
