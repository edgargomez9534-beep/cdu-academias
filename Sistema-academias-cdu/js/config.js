// ═══ CONFIGURACIÓN GLOBAL ═══
const API_URL = "https://script.google.com/macros/s/AKfycbz-ekGNCNMEDlgXAmVPJvejn4J2rdxtzJUb5qKV-FzdXJkxSpN214tj29uEhPvKhMzwjA/exec";
let socios       = JSON.parse(JSON.stringify(SOCIOS_INIT));
let pagos        = JSON.parse(JSON.stringify(PAGOS_INIT));
let lockers      = JSON.parse(JSON.stringify(LOCKERS_INIT));
let activityLog  = [];
let sesionActual = null;
let dataCargada  = false;
let periodoActual = 'hoy';
let pgSocios = 1, pgPagos = 1;
let lockerTab = 'H';
let bajaNS = null, lockerEdit = null;
let clasesPrueba = JSON.parse(localStorage.getItem('cdu_prueba_v1') || '[]');
let cuposCustom  = JSON.parse(localStorage.getItem('cdu_cupos_v1')  || '{}');
let cuposEditKey = null, categoriaNS = null, disciplinaNS = null;
const PER = 25;
const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
               'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

let printAfterSave = false;
let seguroNS = null;
