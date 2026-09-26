/**
 * Nội dung: Sinh mã Vendor (entityid) theo quy tắc XXYZZZZZ
 * Quy tắc: XX: Document Number Prefix của Primary Subsidiary, Y: ký tự đứng trước dấu "_" của Vendor Category, ZZZZZ: số tăng dần theo từng "XX+Y"
 * Ví dụ: 01A00001, 01A00002, 01S00001,...
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham                Init, create file. Sinh mã Vendor, from ms.Ngọc(https://app.clickup.com/t/3773072/86d42w9hv)
 *  25 Sep 2026         Huy Pham                Fix mã Vendor bị NetSuite auto-generate đè khi create (https://app.clickup.com/t/3773072/86d42w9hv?comment=1300230000037758)
 */
define(['N/search',
    '../cons/scv_cons_seqnumber.js',
],(search,
    constSeqNumber,
) => {

    const SEQUENCE_TYPE = "VENDOR";
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

    const getCategoryPrefix = (_categoryId) => {
        if(!_categoryId) return "";

        let objLookup = search.lookupFields({
            type: 'vendorcategory',
            id: _categoryId,
            columns: ['name']
        });

        let categoryName = objLookup['name'] || "";

        //Y: phần ký tự đứng trước dấu "_" trong Vendor Category, nếu không có ký tự nào thì = NULL
        let idxSeparator = categoryName.indexOf("_");

        return idxSeparator > 0 ? categoryName.substring(0, idxSeparator) : "";
    }

    const genVendorCode = (_vendorRec) => {
        let subsidiaryId = _vendorRec.getValue('subsidiary');
        if(!subsidiaryId) return "";

        let subPrefix = getSubsidiaryPrefix(subsidiaryId);
        if(!subPrefix) return "";

        let categoryPrefix = getCategoryPrefix(_vendorRec.getValue('category'));

        //XXY: XX: Document Number Prefix của Subsidiary, Y: Vendor Category
        let prefix = subPrefix + categoryPrefix;

        let entityid_old = _vendorRec.getValue('entityid') || "";

        //Edit: Subsidiary + Category không đổi thì giữ nguyên mã cũ, chỉ sinh lại khi prefix thay đổi
        if(!!_vendorRec.id && entityid_old.indexOf(prefix) == 0 && entityid_old.length == prefix.length + SEQ_LENGTH){
            return entityid_old;
        }

        let curSeqNumber = 1;

        let arrSeqNumber = constSeqNumber.getDataSourceWithFilters({
            custrecord_scv_rcn_subsidiary: subsidiaryId,
            custrecord_scv_rcn_type: SEQUENCE_TYPE,
            custrecord_scv_rcn_prefix: prefix
        });
        if(arrSeqNumber.length > 0){
            curSeqNumber = arrSeqNumber[0].custrecord_scv_rcn_currentnumber * 1 + 1;

            constSeqNumber.updateCurrentNumber(arrSeqNumber[0].internalid, curSeqNumber);
        }
        else{
            constSeqNumber.createSequence({
                name: `${SEQUENCE_TYPE}.${prefix}`.toUpperCase(),
                custrecord_scv_rcn_subsidiary: subsidiaryId,
                custrecord_scv_rcn_type: SEQUENCE_TYPE,
                custrecord_scv_rcn_prefix: prefix,
                custrecord_scv_rcn_currentnumber: curSeqNumber,
            });
        }

        let entityid = prefix + curSeqNumber.toString().padStart(SEQ_LENGTH, '0');

        //Tắt auto-numbering để NetSuite không ghi đè entityid bằng mã tự sinh của hệ thống
        _vendorRec.setValue('autoname', false);
        _vendorRec.setValue('entityid', entityid);

        return entityid;
    }

    return {
        genVendorCode,
    };

});
