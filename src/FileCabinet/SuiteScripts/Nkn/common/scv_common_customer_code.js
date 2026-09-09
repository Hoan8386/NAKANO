/**
 * Nội dung: Sinh mã Customer (entityid) theo quy tắc CUSXXYYYYY
 * Quy tắc: CUS: cụm ký tự cố định, XX: Document Number Prefix của Primary Subsidiary, YYYYY: số tăng dần theo từng "CUS+XX"
 * Ví dụ: CUS0100001, CUS0100002, CUS0200001,...
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham                Init, create file. Sinh mã Customer, from ms.Ngọc(https://app.clickup.com/t/3773072/86d42whgd)
 */
define(['N/search',
    '../cons/scv_cons_seqnumber.js',
],(search,
    constSeqNumber,
) => {

    const SEQUENCE_TYPE = "CUSTOMER";
    const FIXED_PREFIX = "CUS";
    const SEQ_LENGTH = 5;

    const getSubsidiaryPrefix = (_subsidiaryId) => {
        if(!_subsidiaryId) return "";

        let objLookup = search.lookupFields({
            type: search.Type.SUBSIDIARY,
            id: _subsidiaryId,
            columns: ['tranprefix']
        });

        return objLookup['tranprefix'] || "";
    }

    const genCustomerCode = (_customerRec) => {
        let subsidiaryId = _customerRec.getValue('subsidiary');
        if(!subsidiaryId) return "";

        //XX: Document Number Prefix của Primary Subsidiary
        let subPrefix = getSubsidiaryPrefix(subsidiaryId);
        if(!subPrefix) return "";

        //CUSXX: CUS: cụm ký tự cố định, XX: Document Number Prefix của Subsidiary
        let prefix = FIXED_PREFIX + subPrefix;

        let entityid_old = _customerRec.getValue('entityid') || "";

        //Edit: Subsidiary không đổi thì giữ nguyên mã cũ, chỉ sinh lại khi prefix thay đổi
        if(!!_customerRec.id && entityid_old.indexOf(prefix) == 0 && entityid_old.length == prefix.length + SEQ_LENGTH){
            return entityid_old;
        }

        let curSeqNumber = 1;

        let arrSeqNumber = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_subsidiary: subsidiaryId,
            custrecord_scv_rcn_type: SEQUENCE_TYPE,
            custrecord_scv_rcn_prefix: subPrefix
        });
        if(arrSeqNumber.length > 0){
            curSeqNumber = arrSeqNumber[0].custrecord_scv_rcn_currentnumber * 1 + 1;

            constSeqNumber.updateCurrentNumber(arrSeqNumber[0].internalid, curSeqNumber);
        }
        else{
            constSeqNumber.createSequence({
                name: `${SEQUENCE_TYPE}.${subPrefix}`.toUpperCase(),
                custrecord_scv_rcn_subsidiary: subsidiaryId,
                custrecord_scv_rcn_type: SEQUENCE_TYPE,
                custrecord_scv_rcn_prefix: subPrefix,
                custrecord_scv_rcn_currentnumber: curSeqNumber,
            });
        }

        let entityid = prefix + curSeqNumber.toString().padStart(SEQ_LENGTH, '0');

        _customerRec.setValue('entityid', entityid);

        return entityid;
    }

    return {
        genCustomerCode,
    };

});
