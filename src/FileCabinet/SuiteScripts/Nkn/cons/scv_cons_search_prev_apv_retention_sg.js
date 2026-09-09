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
    const TYPE = "purchaseorder";
    const ID = "customsearch_scv_prev_apv_retention_sg";

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

        return filters;
    }

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
    };
});
