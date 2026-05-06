function ajustarMain() {
    let $aside = $('#MenuLateral');
    let $main = $('#main');

    //if ($aside.hasClass('show')) {
    //    $main.removeClass('col-12').addClass('col-xl-9');
    //} else {
    //    $main.removeClass('col-xl-9').addClass('col-12');
    //}

    // Refrescar headers personalizados
    if (window.HeaderFijoGlobalManager) {
        window.HeaderFijoGlobalManager.refrescarTodos();
    }

    // Ajuste INMEDIATO de DataTables
    $.fn.dataTable.tables({ visible: true, api: true })
        .columns.adjust()
        .fixedHeader.adjust();
}

// Ejecutar MÚLTIPLES VECES para garantizar el ajuste
$(document).on('click', '#sidebartoggle', function () {
    ajustarMain(); // Inmediato
    setTimeout(ajustarMain, 200); // Durante animación
    setTimeout(ajustarMain, 450); // Al finalizar
});

$(document).ready(function () {
    ajustarMain();
});