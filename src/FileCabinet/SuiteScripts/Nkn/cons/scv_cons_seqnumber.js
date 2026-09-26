/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026		    Huy Pham			    Init, create file
 *  22 Sep 2026         Huy Pham                Bổ sung updateWithLock (chống tranh chấp bộ đếm) & setInactive
 */
define(['N/search', 'N/record',
    '../cons/scv_cons_search.js',
],
    (search, record,
        constSearch,
    ) => {
        const TYPE = "customrecord_scv_rcnumber";
    
        const Records = {}

        const getDataSource = (_filters) => {
            let resultSearch =  constSearch.createSearchWithFilter({
                type: "customrecord_scv_rcnumber",
                filters:
                [
                    ["isinactive","is","F"]
                ],
                columns:
                [
                    "internalid",
                    "name", "custrecord_scv_rcn_subsidiary",
                    "custrecord_scv_rcn_type", "custrecord_scv_rcn_accountnumber",
                    "custrecord_scv_rcn_yearmonth", "custrecord_scv_rcn_prefix",
                    "custrecord_scv_rcn_currentnumber", "custrecord_scv_rcn_bank_code",
                    "custrecord_scv_rcn_customertnumber"
                ]
            }, _filters);
            
            let arrResult = constSearch.fetchResultSearchRunEach(resultSearch, function(_objTmpl, _column){
                let objResTmpl = constSearch.getObjResultFromSearchWithLabel_V2(_objTmpl, _column);

                return objResTmpl;
            });
            
            return arrResult;
        }

        const getDataSourceWithFilters = (params) =>{
            let filters = [];

            if(params.custrecord_scv_rcn_subsidiary){
                filters.push(search.createFilter({
                    name: 'custrecord_scv_rcn_subsidiary', operator: "anyof", values: params.custrecord_scv_rcn_subsidiary
                }))
            }
            if(params.custrecord_scv_rcn_type){
                filters.push(search.createFilter({
                    name: 'custrecord_scv_rcn_type', operator: "is", values: params.custrecord_scv_rcn_type
                }))
            }
            if(params.custrecord_scv_rcn_yearmonth){
                filters.push(search.createFilter({
                    name: 'custrecord_scv_rcn_yearmonth', operator: "is", values: params.custrecord_scv_rcn_yearmonth
                }))
            }
            if(params.custrecord_scv_rcn_prefix){
                filters.push(search.createFilter({
                    name: 'custrecord_scv_rcn_prefix', operator: "is", values: params.custrecord_scv_rcn_prefix
                }))
            }
            if(params.custrecord_scv_rcn_bank_code){
                filters.push(search.createFilter({
                    name: 'custrecord_scv_rcn_bank_code', operator: "is", values: params.custrecord_scv_rcn_bank_code
                }))
            }

            if(filters.length == 0) return [];

            return getDataSource(filters);
        }

        const createSequence = (mapFieldValues) =>{
            mapFieldValues.custrecord_scv_rcn_currentnumber = mapFieldValues.custrecord_scv_rcn_currentnumber ?? 1;

            let seqNumRec = record.create({type: "customrecord_scv_rcnumber", isDynamic: true});

            Object.keys(mapFieldValues).forEach(fieldId =>{

                seqNumRec.setValue(fieldId, mapFieldValues[fieldId]);
            });
            
            return seqNumRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        }

        const updateCurrentNumber = (_internalId, _curNumber) =>{
            record.submitFields({
                type: 'customrecord_scv_rcnumber', id: _internalId,
                values: {
                    custrecord_scv_rcn_currentnumber: _curNumber
                },
                options: {
                    enableSourcing: false, ignoreMandatoryFields: true
                }
            });
        }

        /**
         * Đọc - tính - ghi bộ đếm trong cùng 1 lần load/save để chống tranh chấp (concurrency).
         * record.save() throw RCRD_HAS_BEEN_CHANGED nếu record bị user khác ghi đè sau thời điểm load
         * -> caller bắt lỗi này để đọc lại & thử lại. record.submitFields KHÔNG có cơ chế kiểm tra này.
         * @param {number|string} _internalId
         * @param {function} _funcBuildValues : nhận Current Number đang lưu, trả về object field cần ghi (null/rỗng = không ghi gì)
         * @returns {object|null} object field đã ghi
         */
        const updateWithLock = (_internalId, _funcBuildValues) =>{
            let seqNumRec = record.load({type: TYPE, id: _internalId});

            let curNumber = seqNumRec.getValue('custrecord_scv_rcn_currentnumber') * 1 || 0;

            let mapFieldValues = _funcBuildValues(curNumber, seqNumRec);

            if(!mapFieldValues || Object.keys(mapFieldValues).length == 0) return null;

            Object.keys(mapFieldValues).forEach(fieldId =>{

                seqNumRec.setValue(fieldId, mapFieldValues[fieldId]);
            });

            seqNumRec.save({enableSourcing: false, ignoreMandatoryFields: true});

            return mapFieldValues;
        }

        const setInactive = (_internalId) =>{
            record.submitFields({
                type: TYPE, id: _internalId,
                values: {
                    isinactive: true
                },
                options: {
                    enableSourcing: false, ignoreMandatoryFields: true
                }
            });
        }

        return {
            TYPE,
            Records,
            getDataSource,
            getDataSourceWithFilters,
            createSequence,
            updateCurrentNumber,
            updateWithLock,
            setInactive,
        };
        
    });
    