function deleteEntry() {
    $(this).parent().remove();
    $.ajax({
      url: `http://localhost:5003/timeline/remove/${this.id}`,
      type: "get",
      success: (e) => {
        console.log(e);
      },
    });
  }
  
  function intoOrder() {
    var id = $(this).attr("id");
    // console.log(id)
    $.ajax({
      url: `http://localhost:5003/order/${id}`,
      type: "get",
      success: (e) => {
        console.log(e);
      },
    });
  }
  
  $(document).ready(function () {
    $("body").on("click", ".DeleteButton", deleteEntry);
    $("body").on("click", ".orderButton", intoOrder);
  });
  