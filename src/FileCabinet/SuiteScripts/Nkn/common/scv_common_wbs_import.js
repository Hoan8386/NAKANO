/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         Huy Pham			    Init, create file, PMP_WBS Import, from ms.Phương Anh(https://app.clickup.com/t/3773072/86d453pe8)
 */
define(['N/search', 'N/record', 'N/query', 'N/error',
    '../olib/alasql/alasql.min@4.6.6.js', 
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_format.js',
],(search, record, query, error,
    alasql,
    lbf,
    constFormat,
) => {
    const Stores = {
        TimeLineType: {
            Global: {
                ID: "Global", NAME: "Global"
            },
            Monthly: {
                ID: "Monthly", NAME: "Monthly"
            },
        },
        
    }

    const getTimeLineTypes = () =>{
        return Object.values(Stores.TimeLineType);
    }

    const getColumnsTask = () =>{
        return [
            {
                id: "custpage_col_id", label: "ID", type: "text"
            },
            {
                id: "custpage_col_name", label: "Title", type: "text"
            },
            {
                id: "custpage_col_startdate", label: "Start date", type: "text"
            },
            {
                id: "custpage_col_enddate", label: "End date", type: "text"
            },
            {
                id: "custpage_col_status", label: "Status", type: "text"
            },
        ]
    }

    const getColumnsWbsLines = (_params) =>{
        let columns = [
            /* {
                id: "custpage_col_seqnum", label: "ID", type: "text"
            }, */
            {
                id: "custpage_col_key", label: "Key", type: "text"
            },
            {
                id: "custpage_col_parentkey", label: "Parent key", type: "text"
            },
            {
                id: "custpage_col_name", label: "Name", type: "text"
            },
            {
                id: "custpage_col_projecttask", label: "Project Task", type: "text"
            },
            {
                id: "custpage_col_workitemcode", label: "Work Item Code", type: "text"
            },
            {
                id: "custpage_col_item", label: "Item", type: "text"
            },
            {
                id: "custpage_col_class", label: "Class", type: "text"
            },
            {
                id: "custpage_col_qty", label: "Qty", type: "float"
            },
            {
                id: "custpage_col_rate", label: "Rate", type: "float"
            },
            {
                id: "custpage_col_date", label: "Date", type: "text"
            },
            {
                id: "custpage_col_etc_cost", label: "ETC Cost", type: "float"
            },
            {
                id: "custpage_col_etc_revenue", label: "ETC Revenue", type: "float"
            },
            
        ];

        return columns;
    }

    const getDataProjectTask = (_params) => {
        let arrResult = query.runSuiteQL({
            query: `SELECT
                id, parent, title, startdatetime, enddate, status
            FROM
                projecttask
            WHERE
                isinactive = 'F'
                AND project = '${_params.custpage_project}'`
        }).asMappedResults();

        arrResult.forEach(objRes => {
            objRes.custpage_col_id = objRes.id;
            objRes.custpage_col_name = objRes.title;
            objRes.custpage_col_startdate = objRes.startdatetime;
            objRes.custpage_col_enddate = objRes.enddate;
            objRes.custpage_col_status = objRes.status;
        });

        return arrResult;
    }

    const formatterResultUpload = (params, resultUpload) =>{
        let arrResult = [];

        const isEmpty = (obj) => {
            if (!obj || typeof obj !== "object") return true;

            return Object.values(obj).every(value =>
                value == null ||
                (typeof value === "string" && value.trim() === "")
            );
        }

        for(let i = 0; i < resultUpload.length; i++){
            let objRes = {...resultUpload[i]};

            if(isEmpty(objRes)) continue;

            let _scvMsgs = [];

            objRes.custpage_col_etc_cost = objRes.custpage_col_etc_cost || 0;
            objRes.custpage_col_etc_revenue = objRes.custpage_col_etc_revenue || 0;

            objRes.custpage_col_date_yyyymmdd = constFormat.dateToChar(objRes.custpage_col_date);

            if(lbf.isContainValue(objRes.custpage_col_qty) && lbf.isContainValue(objRes.custpage_col_rate)){
                objRes.custpage_col_etc_revenue = objRes.custpage_col_qty * objRes.custpage_col_rate;
            }

            if(objRes.custpage_col_etc_cost < 0){
                _scvMsgs.push("{ETC Cost} must be greater than or equal to 0.");
            }
            if(objRes.custpage_col_etc_revenue < 0){
                _scvMsgs.push("{ETC Revenue} must be greater than or equal to 0.");
            }

            objRes._scvMsg = _scvMsgs.join("\n");

            arrResult.push(objRes);
        }

        return arrResult;
    }

    const validationResultLines = (params, resultRawLines) =>{
        let objResponse = {
            isValid: true,
            msg: "",
        };

        if(params.custpage_wbs_timelinetype === Stores.TimeLineType.Monthly.ID){
            let startdate_yyyymmdd = constFormat.dateToChar(params.custpage_wbs_startdate);
            let enddate_yyyymmdd = constFormat.dateToChar(params.custpage_wbs_enddate);
            
            let lineValidDate = resultRawLines.find(e => e.custpage_col_date_yyyymmdd < startdate_yyyymmdd
                || e.custpage_col_date_yyyymmdd > enddate_yyyymmdd
            );
            if(lineValidDate){
                objResponse.isValid = false;
                objResponse.msg = `Line Key = [${lineValidDate.custpage_col_key}] fail at date [${lineValidDate.custpage_col_date}] not between {Start Date} and {End Date}`;

                return objResponse;
            }
        }

        let lineValidAmount = resultRawLines.find(e => e.custpage_col_etc_cost < 0
            || e.custpage_col_etc_revenue < 0
        );
        if(lineValidAmount){
            objResponse.isValid = false;
            objResponse.msg = `Line Key = [${lineValidAmount.custpage_col_key}] must {Cost}, {Revenue} greater or equal zero.`;

            return objResponse;
        }
        

        return objResponse
    }

    const prepareResultLines = (params, resultRawLines) =>{
        let arrResult = [];

        if(params.custpage_wbs_timelinetype === Stores.TimeLineType.Global.ID){
            for(let i = 0; i < resultRawLines.length; i++){
                let objResRawLine = resultRawLines[i];

                let objRes = {
                    key: objResRawLine.custpage_col_key,
                    parentkey: objResRawLine.custpage_col_parentkey,
                    name: objResRawLine.custpage_col_name,
                    projecttask: objResRawLine.custpage_col_projecttask,
                    custrecord_scv_wbs_class: objResRawLine.custpage_col_class,
                    cseg_paactivitycode: objResRawLine.custpage_col_workitemcode,
                    custrecord_scv_wbs_item: objResRawLine.custpage_col_item,
                    custrecord_scv_wbs_qty: objResRawLine.custpage_col_qty,
                    custrecord_scv_wbs_rate: objResRawLine.custpage_col_rate,
                    etc: {
                        cost_etc: objResRawLine.custpage_col_etc_cost,
                        revenue_etc: objResRawLine.custpage_col_etc_revenue,
                    },
                };

                arrResult.push(objRes);
            }
        }
        else if(params.custpage_wbs_timelinetype === Stores.TimeLineType.Monthly.ID){
            resultRawLines.forEach(objResRawLine => {
                objResRawLine.yyyymm = "";

                let lineDate = objResRawLine.custpage_col_date;
                if(lineDate){
                    objResRawLine.yyyymm = constFormat.getYYYY(lineDate) + constFormat.getMM(lineDate);
                }
            });
            
            arrResult = alasql(`SELECT DISTINCT custpage_col_key as key,
                custpage_col_parentkey as parentkey, 
                custpage_col_name as name,
                custpage_col_projecttask as projecttask,
                custpage_col_class as custrecord_scv_wbs_class,
                custpage_col_workitemcode as cseg_paactivitycode,
                custpage_col_item as custrecord_scv_wbs_item,
                0 as custrecord_scv_wbs_qty,
                0 as custrecord_scv_wbs_rate
            FROM ?
            `,[resultRawLines])
            let lstMonth = constFormat.getMonthRanges(params.custpage_wbs_startdate, params.custpage_wbs_enddate);

            lstMonth.forEach((objMonth) => {
                let year_yyyy = constFormat.getYYYY(objMonth.start);
                let month_mm = constFormat.getMM(objMonth.start);
                let yyyymm = year_yyyy + month_mm;

                let prefix_etc_period = month_mm + "_" + year_yyyy + "_";
                
                arrResult.forEach(objRes => {
                    let resultRawLines_period = resultRawLines.filter(e => e.custpage_col_key === objRes.key
                        && e.yyyymm === yyyymm
                    );
                    
                    let objResTotalYYYYMM = alasql(`SELECT SUM(custpage_col_etc_cost) as custpage_col_etc_cost,
                        SUM(custpage_col_etc_revenue) as custpage_col_etc_revenue
                    FROM ?
                    `, [resultRawLines_period])[0];

                    objRes.etc = objRes.etc ?? {};

                    objRes.etc[prefix_etc_period + "cost_etc"] = objResTotalYYYYMM?.custpage_col_etc_cost ?? "";
                    objRes.etc[prefix_etc_period + "revenue_etc"] = objResTotalYYYYMM?.custpage_col_etc_revenue ?? "";
                })
            });
        }
        
        return arrResult;
    }

    const createWbs = (params, resultLines) =>{
        let projectRec = record.load({type: "job", id: params.custpage_project});

        let wbsRecId = projectRec.getValue("wbs");

        let wbsRec = null;
        let sublistId = "lines";

        if(wbsRecId){
            throw error.create({
                name: 'SCV_UPDATE_FAIL', notifyOff: true,
                message: `This project already exists in the WBS and cannot be updated.`,
            });
            return;

            /* wbsRec = record.load({type: "wbs", id: wbsRecId, isDynamic: true});

            let sizeSublist = wbsRec.getLineCount(sublistId);
            while(sizeSublist > 0){
                wbsRec.removeLine({sublistId: sublistId, line: sizeSublist - 1});

                sizeSublist = wbsRec.getLineCount(sublistId);
            } */
        }
        else{
            wbsRec = record.create({
                type: "wbs", isDynamic: true,
                defaultValues: {
                    project: params.custpage_project,
                }
            });
        }

        wbsRec.setValue("description", params.custpage_wbs_description);
        wbsRec.setValue("timelinetype", params.custpage_wbs_timelinetype);

        if(params.custpage_wbs_timelinetype === Stores.TimeLineType.Monthly.ID){
            if(params.custpage_wbs_startdate){
                wbsRec.setValue("startdate", constFormat.parseDate(params.custpage_wbs_startdate));
            }
            if(params.custpage_wbs_enddate){
                wbsRec.setValue("enddate", constFormat.parseDate(params.custpage_wbs_enddate));
            }
        }

        for(let i = 0; i < resultLines.length; i++){
            let objResLine = resultLines[i];
            
            wbsRec.selectNewLine(sublistId);

            wbsRec.setCurrentSublistValue(sublistId, "name", objResLine.name);
            wbsRec.setCurrentSublistValue(sublistId, "custrecord_scv_wbs_qty", objResLine.custrecord_scv_wbs_qty);
            wbsRec.setCurrentSublistValue(sublistId, "custrecord_scv_wbs_rate", objResLine.custrecord_scv_wbs_rate);
            wbsRec.setCurrentSublistText(sublistId, "projecttask", objResLine.projecttask);
            wbsRec.setCurrentSublistText(sublistId, "custrecord_scv_wbs_class", objResLine.custrecord_scv_wbs_class);
            wbsRec.setCurrentSublistText(sublistId, "cseg_paactivitycode", objResLine.cseg_paactivitycode);
            wbsRec.setCurrentSublistText(sublistId, "custrecord_scv_wbs_item", objResLine.custrecord_scv_wbs_item);

            wbsRec.commitLine(sublistId);

            objResLine._indexLine = i;
            objResLine._currentKeyNS = wbsRec.getSublistValue(sublistId, "key", i);

            let lstEtcFields = Object.keys(objResLine.etc);
            lstEtcFields.forEach(fieldId => {
                wbsRec.executeMacro({
                    id: "setAmountFieldValue",
                    params: {
                        lineIndex: objResLine._indexLine,
                        fieldId: fieldId,
                        value: objResLine.etc[fieldId],
                    },
                });
            });
        }
        for(let i = 0; i < resultLines.length; i++){
            let objResLine = resultLines[i];
            if(!objResLine.parentkey) continue;

            let objResLineParent = resultLines.find(e => e.key == objResLine.parentkey);
            if(!objResLineParent) continue;
            
            wbsRec.selectLine(sublistId, objResLine._indexLine);

            wbsRec.setCurrentSublistValue(sublistId, "parentkey", objResLineParent._currentKeyNS);

            wbsRec.commitLine(sublistId);
        }

        wbsRecId = wbsRec.save({enableSourcing: false, ignoreMandatoryFields: true});

        return wbsRecId;
    }

    return {
        Stores,
        getTimeLineTypes,
        getColumnsTask,
        getColumnsWbsLines,
        getDataProjectTask,
        formatterResultUpload,
        validationResultLines,
        prepareResultLines,
        createWbs,
    };

});
