/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/cache', 'N/config', 'N/format', 'N/ui/message', 'N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/ui/serverWidget', 'N/task'
        , '../lib/scv_lib_report.js'],
    
    (cache, config, format, message, record, redirect, runtime, search, serverWidget, task, libRep) => {
        
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        const onRequest = (context) => {
            let request = context.request;
            let response = context.response;
            let parameters = request.parameters;
            let template = parameters.custpage_template;
            let trandate = parameters.custpage_trandate;
            let trandate_tieuthuc = parameters.custpage_trandate_tieuthuc
            //let datebasis = parameters.custpage_datebasis;
            let subsidiary = parameters.custpage_subsidiary;
            
            let isRun = true, iscomplete = true;
            if (!template || !trandate || !subsidiary || !trandate_tieuthuc) {
                isRun = false;
            }
            
            if (!subsidiary) {
                let userObj = runtime.getCurrentUser();
                subsidiary = userObj.subsidiary + '';
            }
            
            let myCache = cache.getCache({
                name: 'crunLDCTemplate',
                scope: cache.Scope.PUBLIC
            });
            
            let mrTaskId = parameters.mrTaskId;
            if (!mrTaskId) {
                mrTaskId = myCache.get({key: 'mrTaskId', loader: 'loader'});
            }
            let messageInfo = '';
            if (mrTaskId) {
                let taskStatus = task.checkStatus(mrTaskId);
                messageInfo = 'TaskId ' + mrTaskId + ' for Landed Cost Allocation is: ' + taskStatus.status;
                if (taskStatus.status === 'COMPLETE' || taskStatus.status === 'FAILED') {
                    myCache.remove({key: 'mrTaskId'});
                } else {
                    iscomplete = false;
                }
            }
            let configRecObj = config.load({type: config.Type.USER_PREFERENCES});
            let timezone = configRecObj.getValue('TIMEZONE');
            
            if (request.method === 'GET') {
                let title = 'Landed Cost Allocation';
                let form = serverWidget.createForm({
                    title: title
                });
                form.clientScriptModulePath = '../cssl/scv_cs_sl_allocation_ldc.js';
                form.addButton({id: 'custpage_bt_search', label: 'Search', functionName: 'searchReport()'});
                if (messageInfo) {
                    form.addPageInitMessage({type: message.Type.INFORMATION, message: messageInfo, duration: -1});
                }
                
                if (iscomplete) {
                    form.addSubmitButton({label: 'Run Phân bổ'});
                } else {
                    form.addButton({id: 'custpage_bt_refresh', label: 'Refresh', functionName: 'refresh()'});
                }
                if (template) {
                    template = template.split(',');
                }
                if (subsidiary) {
                    subsidiary = subsidiary.split(',');
                }
                addFieldSearch(form, template, trandate, trandate_tieuthuc, subsidiary);
                addFieldDefault(form);
                if (isRun) {
                    searchByTemplate(form, template[0], trandate, timezone, trandate_tieuthuc, subsidiary);
                    
                }
                response.writePage(form);
            } else {
                if (isRun) {
                    mrTaskId = '';
                    try {
                        let par_trandate = format.parse({value: trandate, type: format.Type.DATE, timezone: timezone});
                        let year_month = par_trandate.getFullYear() + '-' + String(par_trandate.getMonth() + 1).padStart(2, '0') + '-' + String(par_trandate.getDate()).padStart(2, '0');
                        let par_trandate_tieuthuc = format.parse({
                            value: trandate_tieuthuc,
                            type: format.Type.DATE,
                            timezone: timezone
                        });
                        let year_month_tieuthuc = par_trandate_tieuthuc.getFullYear() + '-' + String(par_trandate_tieuthuc.getMonth() + 1).padStart(2, '0') + '-' + String(par_trandate_tieuthuc.getDate()).padStart(2, '0');
                        let trandate_trandate = parameters.custpage_trandate_trandate;
                        let par_year_month_trandate = format.parse({
                            value: trandate_trandate,
                            type: format.Type.DATE,
                            timezone: timezone
                        });
                        let year_month_trandate = par_year_month_trandate.getFullYear() + '-' + String(par_year_month_trandate.getMonth() + 1).padStart(2, '0') + '-' + String(par_year_month_trandate.getDate()).padStart(2, '0');
                        let ordertype = parameters.custpage_ordertype;
                        let memo = parameters.custpage_memo;
                        
                        if (ordertype) {
                            ordertype = ordertype.toString();
                        }
                        if (memo) {
                            memo = memo.toString();
                        }
                        
                        let mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: 'customscript_scv_mr_allocation_ldc',
                            deploymentId: 'customdeploy_scv_mr_allocation_ldc'
                        });
                        mrTask.params = {
                            custscript_scv_mr_ldc_altemplate: template.toString(),
                            custscript_scv_mr_ldc_year_month: year_month.toString(),
                            custscript_scv_mr_ldc_timezone: timezone.toString(),
                            custscript_scv_mr_ldc_trandate: trandate.toString(),
                            custscript_scv_mr_ldc_ordertype: ordertype,
                            custscript_scv_mr_ldc_memo: memo,
                            custscript_scv_mr_ldc_year_month_tt: year_month_tieuthuc.toString(),
                            custscript_scv_mr_ldc_trandate_tt: trandate_tieuthuc.toString(),
                            custscript_scv_mr_ldc_year_month_td: year_month_trandate.toString(),
                            custscript_scv_mr_ldc_subsidiary: subsidiary.toString()
                        };
                        mrTaskId = mrTask.submit();
                        myCache.put({key: 'mrTaskId', value: mrTaskId});
                    } catch (e) {
                        log.error('exception', e);
                    }
                }
                redirect.toSuitelet({
                    scriptId: 'customscript_scv_sl_allocation_ldc',
                    deploymentId: 'customdeploy_scv_sl_allocation_ldc',
                    parameters: {mrTaskId: mrTaskId, custpage_template: template}
                });//, custpage_trandate: trandate
            }
        }
        
        const searchByTemplate = (form, template, trandate, timezone, trandate_tieuthuc, subsidiary) => {
            let recTemplate = record.load({type: 'customrecord_scv_altem', id: template});
            let ssSource = recTemplate.getValue('custrecord_scv_allocation_source');
            let ssTieuthuc = recTemplate.getValue('custrecord_scv_allocation_h');
            let sdaterule = String(recTemplate.getValue('custrecord_scv_allocation_sdaterule'));
            let hdaterule = String(recTemplate.getValue('custrecord_scv_allocation_hdaterule'));
            
            let sublistSource = form.addSublist({
                id: 'custpage_sl_source_' + template,
                type: serverWidget.SublistType.LIST,
                //tab: tab,
                label: 'Source'
            });
            let slSourceField = 'custpage_sl_source_field_' + template + '_';
            let sublistTieuthuc = form.addSublist({
                id: 'custpage_sl_tieuthuc_' + template,
                type: serverWidget.SublistType.LIST,
                //tab: tab,
                label: 'Tiêu thức'
            });
            let slTieuthucField = 'custpage_sl_tieuthuc_field_' + template + '_';
            let par_trandate = format.parse({value: trandate, type: format.Type.DATE, timezone: timezone});
            
            let sisnonsub = recTemplate.getValue('custrecord_scv_allocation_sisnonsub');
            let sfsubsidiaryid = recTemplate.getValue('custrecord_scv_allocation_sfsubsidiaryid');
            let sfdateid = recTemplate.getValue('custrecord_scv_allocation_sfdateid');
            let hisnonsub = recTemplate.getValue('custrecord_scv_allocation_hisnonsub');
            let hfsubsidiaryid = recTemplate.getValue('custrecord_scv_allocation_hfsubsidiaryid');
            let hfdateid = recTemplate.getValue('custrecord_scv_allocation_hfdateid');
            
            par_trandate.setDate(1);
            par_trandate = format.format({value: par_trandate, type: format.Type.DATE});
            
            let f3 = null, hf3 = null;
            let f1 = search.createFilter({
                name: sfdateid || 'trandate',
                operator: search.Operator.ONORBEFORE,
                values: trandate
            });
            let f2 = search.createFilter({
                name: sfdateid || 'trandate',
                operator: search.Operator.ONORAFTER,
                values: par_trandate
            });
            if (!sisnonsub && isOneWorld()) {
                f3 = search.createFilter({
                    name: sfsubsidiaryid || 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: subsidiary
                });
            }
            
            let hf1 = search.createFilter({
                name: hfdateid || 'trandate',
                operator: search.Operator.ONORBEFORE,
                values: trandate
            });
            let hf2 = search.createFilter({
                name: hfdateid || 'trandate',
                operator: search.Operator.ONORAFTER,
                values: par_trandate
            });
            if (!hisnonsub && isOneWorld()) {
                hf3 = search.createFilter({
                    name: hfsubsidiaryid || 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: subsidiary
                });
            }
            
            if (sdaterule === '1') {
                searchAndDraw(ssSource, sublistSource, slSourceField, f1, f2, f3);
            } else if (sdaterule === '2') {
                searchAndDraw(ssSource, sublistSource, slSourceField, f1, null, f3);
            } else if (sdaterule === '3') {
                searchAndDraw(ssSource, sublistSource, slSourceField, null, null, f3);
            }
            if (hdaterule === '1') {
                searchAndDraw(ssTieuthuc, sublistTieuthuc, slTieuthucField, hf1, hf2, hf3);
            } else if (hdaterule === '2') {
                searchAndDraw(ssTieuthuc, sublistTieuthuc, slTieuthucField, hf1, null, hf3);
            } else if (hdaterule === '3') {
                searchAndDraw(ssTieuthuc, sublistTieuthuc, slTieuthucField, null, null, hf3);
            }
        }

        const isOneWorld = () => {
            return runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});
        }

        const searchAndDraw = (ssid, sublist, slFieldId, f1, f2, f3) => {
            let pgSize = 1000;
            let s = search.load(ssid);
            let f = s.filters;
            if (f3) {
                f.push(f3);
            }
            if (f1) {
                f.push(f1);
            }
            if (f2) {
                f.push(f2);
            }
            s.filters = f;
            let c = s.columns;
            let lc = c.length;
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                log.error('exception', e);
                log.error('value', 'ssid: ' + ssid);
                r = s.runPaged({pageSize: pgSize});
            }
            libRep.addFieldSublist(sublist, c, slFieldId);
            sublist.updateTotallingFieldId({id: slFieldId + (lc - 1)});
            let col = JSON.parse(JSON.stringify(c));
            let vrNone = '- None -';
            let numPage = r.pageRanges.length;
            let searchPage, tempData, numTemp, tempValue, line = 0, j = 0;
            for (let np = 0; np < numPage; np++) {
                searchPage = r.fetch({index: np});
                tempData = searchPage.data;
                if (tempData) {
                    numTemp = tempData.length;
                    for (let i = 0; i < numTemp; i++) {
                        for (j = 0; j < lc; j++) {
                            tempValue = libRep.getValueDisplay(tempData[i], col[j], c[j]);
                            if (tempValue !== vrNone && tempValue) {
                                sublist.setSublistValue({id: slFieldId + j, line: line, value: tempValue});
                            }
                        }
                        line++;
                    }
                }
            }
        }
        
        const addFieldSearch = (form, template, trandate, trandate_tieuthuc, subsidiary) => {
            let groupMainId = 'fieldgroup_dc_main';
            form.addFieldGroup({
                id: 'fieldgroup_dc_main',
                label: 'Criteria'
            });
            
            let fTemplate = form.addField({
                id: 'custpage_template', type: serverWidget.FieldType.MULTISELECT,
                label: 'Template', container: groupMainId
            });
            //fTemplate.defaultValue = template;
            libRep.addSearch('customrecord_scv_altem', ['name'], [['custrecord_scv_allocation_type', 'anyof', 2]], template, fTemplate, false);
            fTemplate.isMandatory = true;
            
            let fSubsidiary = form.addField({
                id: 'custpage_subsidiary', type: serverWidget.FieldType.MULTISELECT,
                label: 'Subsidiary', container: groupMainId
            });
            libRep.addSelectSubsidiary(fSubsidiary, subsidiary);
            fSubsidiary.isMandatory = true;
            
            let fTrandate = form.addField({
                id: 'custpage_trandate', type: serverWidget.FieldType.DATE,
                label: 'Date - Source', container: groupMainId
            });
            fTrandate.defaultValue = trandate;
            fTrandate.isMandatory = true;
            
            let fTrandateTT = form.addField({
                id: 'custpage_trandate_tieuthuc', type: serverWidget.FieldType.DATE,
                label: 'Date - Tiêu thức', container: groupMainId
            });
            fTrandateTT.defaultValue = trandate_tieuthuc;
            fTrandateTT.isMandatory = true;
        }
        
        const addFieldDefault = (form) => {
            form.addFieldGroup({
                id: 'fieldgroup_dc_default',
                label: 'Default Value'
            });
            let fOrdertype = form.addField({
                id: 'custpage_ordertype', type: serverWidget.FieldType.SELECT,
                label: 'Transaction Type', container: 'fieldgroup_dc_default'
            });
            addSelectionOrderType(fOrdertype, null);
            form.addField({
                id: 'custpage_memo', type: serverWidget.FieldType.TEXT,
                label: 'Memo', container: 'fieldgroup_dc_default'
            });
            
            let fTrandate = form.addField({
                id: 'custpage_trandate_trandate', type: serverWidget.FieldType.DATE,
                label: 'Date', container: 'fieldgroup_dc_default'
            });
            fTrandate.isMandatory = true;
            
        }
        
        const addSelectionOrderType = (custpage_ordertype, ordertype) => {
            // let sqlAcc = `select ot.id value, ot.name text from customrecord_scv_order_type ot where ot.isinactive = 'F' and ot.custrecord_scv_app_trans_type = ?`;
            // libRep.addSelectionViaSql(custpage_ordertype, sqlAcc, [11], true, ordertype);
            let c = ['internalid', 'name'];
            let f = [['isinactive', 'is',  'F'], 'and', ['custrecord_scv_app_trans_type', 'anyof', '11']];
            libRep.addSelection(custpage_ordertype, 'customrecord_scv_order_type', c, f, true, ordertype);
        }
        
        return {
            onRequest
        };
        
    });
