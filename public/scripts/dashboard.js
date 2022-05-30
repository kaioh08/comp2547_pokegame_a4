$(document).ready(function () {
    $(".promote").change(function () {
      var email = $(this).attr("id").slice(7);
      $.ajax({
        url: `/dashboard/${email}`,
        method: "GET",
        success: () => {
          window.location.href = "/dashboard";
        },
      });
    });
  
    $("body").on("click", ".delete", function () {
      var email = $(this).attr("id").slice(6);
      $(this).parent().parent().remove();
      $.ajax({
        url: `/dashboard/remove/${email}`,
        method: "GET",
        success: () => {
          $(this).remove();
        },
      });
    });
  });