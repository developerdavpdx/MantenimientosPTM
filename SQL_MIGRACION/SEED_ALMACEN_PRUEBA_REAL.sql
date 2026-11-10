-- ============================================================================
-- SEED DE PRUEBA - MODULO ALMACEN CON ARTICULO REAL (HANA CLOUD / DBADMIN)
-- Fecha: 10/11/2026
--
-- Usa el articulo real: 42000000001 - ABRAZADERA SIN FIN 1 1/2 IN / HS-16
--   DfltWH=COR040, grupo 104, stock 29 (COR040), min 30, max 60.
-- NO inserta en OITM/OITW/OITB (esos ya existen y no se tocan).
--
-- Claves de prueba: ZZTEST / ZZTEST-OC / ZZ01 / 900001 / 999 / 999999
-- Limpieza: CLEANUP_ALMACEN_PRUEBA.sql
-- ============================================================================

-- Limpieza previa (idempotente; incluye el seed fake anterior ZZTEST01)
DELETE FROM "DBADMIN"."PdxMTTORechazoDevolucion" WHERE "ID_RECHAZO"=900001;
DELETE FROM "DBADMIN"."PdxMTTOMovimientosAlmacen" WHERE "ID_SOLICITUD"=900001;
DELETE FROM "DBADMIN"."PdxMTTOMPSolicitudCompraDetalle" WHERE "ID_DETALLE"=900001;
DELETE FROM "DBADMIN"."PdxMTTOMPSolicitudCompra" WHERE "ID_SOLICITUD_COMPRA"=900001;
DELETE FROM "DBADMIN"."PdxMTTOMPSolicitudRefacciones" WHERE "ID_SOLICITUD"=900001;
DELETE FROM "DBADMIN"."PdxMTTOMCSolicitudRefacciones" WHERE "ID_SOLICITUD"=900001;
DELETE FROM "DBADMIN"."@PDX_NOTIFICACIONES" WHERE "Code"='ZZTEST01';
DELETE FROM "DBADMIN"."IGE1" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."OIGE" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."PRQ1" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."OPRQ" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."POR1" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."OPOR" WHERE "DocEntry"=900001;
DELETE FROM "DBADMIN"."OITW" WHERE "ItemCode"='ZZTEST01';
DELETE FROM "DBADMIN"."OITM" WHERE "ItemCode"='ZZTEST01';
DELETE FROM "DBADMIN"."OITB" WHERE "ItmsGrpCod"=999;
DELETE FROM "DBADMIN"."OWHS" WHERE "WhsCode"='ZZ';
DELETE FROM "DBADMIN"."OHEM" WHERE "empID"=999999;
DELETE FROM "DBADMIN"."OUSR" WHERE "USERID"=32000;
DELETE FROM "DBADMIN"."OUBR" WHERE "Code"=999;
DELETE FROM "DBADMIN"."OPRC" WHERE "PrcCode"='ZZ01';
DELETE FROM "DBADMIN"."NNM1" WHERE "Series"=999;

-- ============================================================================
-- MAESTROS DE APOYO (NO se toca OITM/OITW/OITB)
-- ============================================================================
INSERT INTO "DBADMIN"."OHEM" ("empID","firstName","middleName","lastName","dept","ExtEmpNo","email")
VALUES (999999,'PRUEBA','','OPENCODE',1,'9999','prueba@test.com');

INSERT INTO "DBADMIN"."OUSR" ("USERID","INTERNAL_K","USER_CODE","U_NAME","E_Mail","Locked")
VALUES (32000,32000,'ZZTEST','Prueba ZZTEST','prueba@test.com','N');

INSERT INTO "DBADMIN"."OUBR" ("Code","Name")
VALUES (999,'Sucursal ZZTEST');

INSERT INTO "DBADMIN"."OPRC" ("PrcCode","PrcName","DimCode")
VALUES ('ZZ01','Centro ZZTEST',1);

INSERT INTO "DBADMIN"."NNM1" ("ObjectCode","Series","SeriesName","DocSubType","SeriesType","Locked","NextNumber","InitialNum","NumSize")
VALUES ('60',999,'ZZTEST','--','D','N',1,1,1);

INSERT INTO "DBADMIN"."@PDX_NOTIFICACIONES" ("Code","Name","U_PDX_CODE","U_PDX_TIPO","U_PDX_CODE_AUTORIZADOR")
VALUES ('ZZTEST01','Notificacion ZZTEST','ZZTEST01','TEST','ZZTEST');

-- ============================================================================
-- ORDEN DE COMPRA (OPOR/POR1) - articulo real
-- ============================================================================
INSERT INTO "DBADMIN"."OPOR" ("DocEntry","DocNum","DocDate","CardCode","CardName","Comments","DocTotal","DocStatus","CANCELED","DocType","Instance","Segment","DocSubType","PIndicator","Series")
VALUES (900001,900001,CURRENT_DATE,'ZZTEST','Proveedor ZZTEST','SEED',100,'O','N','I',0,0,'--',' ',999);

INSERT INTO "DBADMIN"."POR1" ("DocEntry","LineNum","ItemCode","Dscription","Quantity","WhsCode","Price","LineTotal","unitMsr","NumPerMsr","AcctCode","OcrCode","OcrCode2","OcrCode3","OcrCode4","BaseRef")
VALUES (900001,0,'42000000001','ABRAZADERA SIN FIN 1 1/2 IN / HS-16',1,'COR040',100,100,'UN',1,'ZZTEST','ZZ01','ZZ01','ZZ01','ZZ01','');

-- ============================================================================
-- SALIDA DE INVENTARIO (OIGE/IGE1) - articulo real
-- ============================================================================
INSERT INTO "DBADMIN"."OIGE" ("DocEntry","DocNum","DocDate","CardCode","Comments","DocTotal","DocStatus","CANCELED","DocType","Instance","Segment","DocSubType","PIndicator","Series")
VALUES (900001,900001,CURRENT_DATE,'ZZTEST','SEED',100,'O','N','I',0,0,'--',' ',999);

INSERT INTO "DBADMIN"."IGE1" ("DocEntry","LineNum","ItemCode","Quantity","WhsCode","Price","LineTotal","unitMsr","NumPerMsr","AcctCode","OcrCode","OcrCode2","OcrCode3","OcrCode4","BaseRef")
VALUES (900001,0,'42000000001',2,'COR040',50,100,'UN',1,'ZZTEST','ZZ01','ZZ01','ZZ01','ZZ01','');

-- ============================================================================
-- SOLICITUD DE COMPRA (OPRQ/PRQ1) - articulo real
-- ============================================================================
INSERT INTO "DBADMIN"."OPRQ" ("DocEntry","DocNum","DocDate","CardCode","Comments","DocTotal","DocStatus","CANCELED","DocType","Instance","Segment","DocSubType","PIndicator","Series")
VALUES (900001,900001,CURRENT_DATE,'ZZTEST','SEED',100,'O','N','I',0,0,'--',' ',999);

INSERT INTO "DBADMIN"."PRQ1" ("DocEntry","LineNum","ItemCode","Dscription","Quantity","WhsCode","Price","LineTotal","unitMsr","NumPerMsr","AcctCode","OcrCode","OcrCode2","OcrCode3","OcrCode4","BaseRef")
VALUES (900001,0,'42000000001','ABRAZADERA SIN FIN 1 1/2 IN / HS-16',1,'COR040',100,100,'UN',1,'ZZTEST','ZZ01','ZZ01','ZZ01','ZZ01','');

-- ============================================================================
-- DATOS DEL PORTAL (PdxMTTO) - articulo real
-- ============================================================================
INSERT INTO "DBADMIN"."PdxMTTOMPSolicitudRefacciones"
("ID_SOLICITUD","ORDEN_TRABAJO","ID_EQUIPO","REFACCION_SOLICITADA","CANTIDAD","NIVEL_URGENCIA","DESCRIPCION_NECESIDAD","FECHA_SOLICITUD","ESTATUS","USUARIO_SOLICITA","USUARIO_ATIENDE","FECHA_ATENCION","PLANTA","TIPO","ACEPTADA_MANTENIMIENTO")
VALUES (900001,'OTMC-001',2,'42000000001',2,'Alta','SEED - refaccion de prueba',CURRENT_TIMESTAMP,'Atendida','prueba@test.com','prueba@test.com',CURRENT_TIMESTAMP,'1',2,'true');

INSERT INTO "DBADMIN"."PdxMTTOMPSolicitudCompra"
("ID_SOLICITUD_COMPRA","COMENTARIOS","FECHA_SOLICITUD","ESTATUS","USUARIO_SOLICITA","USUARIO_ATIENDE","FECHA_ATENCION","CENTRO_COSTO_1","CENTRO_COSTO_2","CENTRO_COSTO_3","CENTRO_COSTO_4","DOC_NUM","DOC_ENTRY","RESPONSE_SAP","FOLIO_COMPRA","ATENDIDA","COM_RECHAZO","PLANTA","FECHA_REQUERIDA")
VALUES (900001,'SEED - solicitud de compra',CURRENT_TIMESTAMP,'Pendiente','prueba@test.com','prueba@test.com',CURRENT_TIMESTAMP,'ZZ01','ZZ01','ZZ01','ZZ01','900001','900001','','ZZTEST-OC',0,NULL,1,CURRENT_DATE);

INSERT INTO "DBADMIN"."PdxMTTOMPSolicitudCompraDetalle"
("ID_DETALLE","ID_SOLICITUD_COMPRA","ID_SOLICITUD_REFACCION","CANTIDAD_ENCARGAR","CARD_CODE","CODIGO_ARTICULO")
VALUES (900001,900001,900001,2,'ZZTEST','42000000001');

INSERT INTO "DBADMIN"."PdxMTTOMovimientosAlmacen"
("ID_SOLICITUD","TIPO","SOLICITANTE","NUM_EMPLEADO","AREA","DOCENTRY","ENTREGA","RECIBE","FECHA_INGRESO","DEPT","PROCESO","GASTOS","CEDIS","CANTIDAD_REAL","ESTATUS","COMENTARIOS")
VALUES (900001,'SALIDA','PRUEBA ZZTEST','9999','TEST',900001,'ALMACEN','PRUEBA ZZTEST',CURRENT_TIMESTAMP,'TEST','TEST','TEST','TEST',2,1,'SEED - salida');

INSERT INTO "DBADMIN"."PdxMTTOMovimientosAlmacen"
("ID_SOLICITUD","TIPO","SOLICITANTE","NUM_EMPLEADO","AREA","DOCENTRY","ENTREGA","RECIBE","FECHA_INGRESO","DEPT","PROCESO","GASTOS","CEDIS","CANTIDAD_REAL","ESTATUS","COMENTARIOS")
VALUES (900001,'DEVOLUCION','PRUEBA ZZTEST','9999','TEST',900001,'ALMACEN','PRUEBA ZZTEST',CURRENT_TIMESTAMP,'TEST','TEST','TEST','TEST',1,1,'SEED - devolucion');

INSERT INTO "DBADMIN"."PdxMTTORechazoDevolucion"
("ID_RECHAZO","ID_SALIDA","MOTIVO","COMENTARIOS","FECHA_INGRESO")
VALUES (900001,900001,'SEED','SEED - rechazo',CURRENT_TIMESTAMP);

INSERT INTO "DBADMIN"."PdxMTTOMCSolicitudRefacciones"
("ID_SOLICITUD","ORDEN_TRABAJO","REFACCION_SOLICITADA","CANTIDAD","NIVEL_URGENCIA","DESCRIPCION_NECESIDAD","ESTATUS","USUARIO_SOLICITA")
VALUES (900001,'OTMC-001','42000000001',1,'Baja','SEED - correctivo','Pendiente','prueba@test.com');

COMMIT;
