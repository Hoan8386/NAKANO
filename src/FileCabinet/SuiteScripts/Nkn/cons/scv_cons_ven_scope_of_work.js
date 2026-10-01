/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Oct 2026         Thanh Hoan			    Init, create file 
 */
define([],
    () => {
        const Records = {
            Material: {
                ID: 1,
                NAME: "Material"
            },
            Labour: {
                ID: 2 ,
                NAME: "Labour"
            },
            Both: {
                ID: 3,
                NAME: "Both"
            },
            Service: {
                ID: 4,
                NAME: "Service"
            },
            Rental: {
                ID: 5,
                NAME: "Rental"
            },
        }

        return {
            TYPE: "customlist_scv_ven_scope_of_work",
            Records,
        };
        
    });
