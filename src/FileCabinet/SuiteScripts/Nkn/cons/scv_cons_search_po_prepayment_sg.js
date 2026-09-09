/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Sep 2026         Phu Pham			    Init, create file
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], function (search,
    
    constSearch
) {
    const TYPE = "vendorbill";
    const ID = "customsearch_scv_po_prepayment_sg";

    const Records = {};

    const getDataSource = (_params) => {
        let filters = createFiltersFromParams(_params);

        return constSearch.getDataSource_Mixed(ID, filters, [], Records);
    };

    const createFiltersFromParams = (_params) => {
        const filters = [];

        if (_params.internalid) {
			filters.push(search.createFilter({
				name: 'internalid', operator: 'anyof', values: _params.internalid
			}));
		}

        if(_params.createdfrom) {
            filters.push(search.createFilter({
				name: 'createdfrom', operator: 'anyof', values: _params.createdfrom
			}));
        }

        return filters;
    }

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
