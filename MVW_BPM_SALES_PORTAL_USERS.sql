SELECT DISTINCT mainqry.DLR_CODE,
                    mainqry.DLR_BRANCH_CODE,
                    mainqry.DLR_NAME,
                    mainqry.USER_TYPE,
                    mainqry.TCKNO,
                    mainqry.FULL_NAME,
                    mainqry.USER_NAME,
                    mainqry.USER_CODE,
                    mainqry.USER_EMAIL,
                    mainqry.USER_PHONE,
                    mainqry.REGION_CODE,
                    mainqry.REGION_NAME
      FROM (SELECT qry.*, req.REGION_CODE, req.REGION_NAME
              FROM (SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'REGION_SALES_SUPPORT'     AS USER_TYPE,
                           NULL                       AS TCKNO,
                           ss.USER_NAME               AS FULL_NAME,
                           ss.USER_ID                 AS USER_NAME,
                           ss.USER_EMPLOYEE_ID        AS USER_CODE,
                           ss.USER_EMAIL              AS USER_EMAIL,
                           NULL                       AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_REGION_SALES_SUPPORT ss
                               ON     ss.DLR_REGION_ID = o.REGION_ID
                                  AND ss.IS_DELETED = 0
                     WHERE o.DLR_STATUS = 'Active'
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'REGION_MANAGER'              AS USER_TYPE,
                           NULL                          AS TCKNO,
                           r.REGION_MANAGER_USERNAME     AS FULL_NAME,
                           r.REGION_MANAGER              AS USER_NAME,
                           NULL                          AS USER_CODE,
                           r.REGION_MANAGER_EMAIL        AS USER_EMAIL,
                           NULL                          AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_REGIONS r
                               ON r.ID = o.REGION_ID AND r.IS_DELETED = 0
                     WHERE o.DLR_STATUS = 'Active'
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'INVESTOR'             AS USER_TYPE,
                           a.TC_IDENTITY_NO       AS TCKNO,
                           a.FULL_NAME            AS FULL_NAME,
                           a.DOMAIN_USER_ID       AS USER_NAME,
                           a.INVESTOR_ID          AS USER_CODE,
                           A.EMAIL                AS USER_EMAIL,
                           a.PHONE_NUMBER_GSM     AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_INVESTORS A
                               ON     a.DLR_ID = o.DLR_ID
                                  AND a.COMPANY_OWNER = 1
                                  AND a.IS_DELETED = 0
                     WHERE     o.DLR_STATUS = 'Active'
                           AND A.TC_IDENTITY_NO IS NOT NULL
                           AND A.FULL_NAME IS NOT NULL
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'REGIONS_DIRECTOR'                 AS USER_TYPE,
                           NULL                               AS TCKNO,
                           r.REGIONS_DIRECTOR_USERNAME        AS FULL_NAME,
                           r.REGIONS_DIRECTOR                 AS USER_NAME,
                           r.REGIONS_DIRECTOR_EMPLOYEE_ID     AS USER_CODE,
                           r.REGIONS_DIRECTOR_EMAIL           AS USER_EMAIL,
                           NULL                               AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_REGIONS r
                               ON r.ID = o.REGION_ID AND r.IS_DELETED = 0
                     WHERE o.DLR_STATUS = 'Active'
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'REGION_DIRECTOR'                 AS USER_TYPE,
                           NULL                              AS TCKNO,
                           r.REGION_DIRECTOR_USERNAME        AS FULL_NAME,
                           r.REGION_DIRECTOR                 AS USER_NAME,
                           r.REGION_DIRECTOR_EMPLOYEE_ID     AS USER_CODE,
                           r.REGION_DIRECTOR_EMAIL           AS USER_EMAIL,
                           NULL                              AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_REGIONS r
                               ON r.ID = o.REGION_ID AND r.IS_DELETED = 0
                     WHERE o.DLR_STATUS = 'Active'
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           'REGION_SALES_MANAGER'     AS USER_TYPE,
                           NULL                       AS TCKNO,
                           sm.USER_NAME               AS FULL_NAME,
                           sm.USER_ID                 AS USER_NAME,
                           sm.USER_EMPLOYEE_ID        AS USER_CODE,
                           sm.USER_EMAIL              AS USER_EMAIL,
                           NULL                       AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_REGION_SALES_MANAGERS sm
                               ON     sm.ID = o.SALES_MANAGER_ID
                                  AND sm.IS_DELETED = 0
                     WHERE o.DLR_STATUS = 'Active'
                    UNION ALL
                    SELECT o.DLR_ID,
                           o.REGION_ID,
                           o.DLR_CODE,
                           o.DLR_BRANCH_CODE,
                           o.DLR_NAME,
                           CASE
                               WHEN pu.USER_TYPE = 'GENERIC' THEN 'GENERIC'
                               ELSE tit.TITLE
                           END
                               AS USER_TYPE,
                           pu.EMPLOYEE_NO
                               AS TCKNO,
                           pu.FIRST_NAME || ' ' || pu.LAST_NAME
                               AS FULL_NAME,
                           pu.DOMAIN_USER_ID
                               AS USER_NAME,
                           pu.PROFILE_CODE
                               AS USER_CODE,
                           NULL
                               AS USER_EMAIL,
                           pu.PHONE_NUMBER_GSM
                               AS USER_PHONE
                      FROM PRM_DLRS  o
                           LEFT JOIN PRM_DLR_USERS pdu
                               ON pdu.DLR_ID = o.DLR_ID
                           LEFT JOIN PRM_USERS pu
                               ON     pu.ID = pdu.DLR_USER_ID
                                  AND pu.IS_DELETED = 0
                           LEFT JOIN PRM.PRM_PARAM_TITLES tit
                               ON tit.ID = pu.TITLE_ID
                           LEFT JOIN PRM_DLR_REGIONS r ON r.ID = o.REGION_ID
                     WHERE     o.DLR_STATUS = 'Active'
                           AND pdu.IS_DELETED = 0
                           AND pu.IS_DELETED = 0) qry
                   LEFT JOIN PRM_DLR_REGIONS req
                       ON req.ID = qry.REGION_ID AND req.IS_DELETED = 0)
           mainqry;