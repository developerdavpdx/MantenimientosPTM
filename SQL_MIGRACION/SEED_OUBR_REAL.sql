-- ============================================================================
-- OUBR REAL - EXPORT ON-PREMISE TEST_JUNIO_2026
-- Fuente: OUBR.csv (14 filas)
-- Idempotente: borra las sucursales del CSV y las reinserta; elimina 999 de prueba.
-- ============================================================================

DELETE FROM "DBADMIN"."OUBR" WHERE "Code" IN (1,10,11,12,13,2,-2,3,4,5,6,7,8,9);
DELETE FROM "DBADMIN"."OUBR" WHERE "Code"=999;

-- Datos reales
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (-2,'Principal','Sucursal pral.',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (1,'CORP','CORP',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (2,'GDL','GDL',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (3,'GTO','GTO',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (4,'MTY','MTY',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (5,'PUE','PUE',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (6,'TMX','TMX',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (7,'TUX','TUX',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (8,'MDA','MDA',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (9,'TOR','TOR',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (10,'CLN','CLN',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (11,'HMO','HMO',1);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (12,'PII','PLANTA II',57);
INSERT INTO "DBADMIN"."OUBR" ("Code","Name","Remarks","UserSign") VALUES (13,'CHI','CHI',1);

COMMIT;
