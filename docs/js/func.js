var $ = document.querySelector.bind(document)

var input = $('#input')
var dropbox = $("#drop")
var choose = $("#choose")
var imgWrap = $("#img-wrap")
var submit = $("#submit")

//input获取文件事件
input.addEventListener("change", function(e) {
    e.preventDefault()
    var fileList = inputEventToFile(e)

    fileList.forEach((item, index) => {
        compressImg(item, (item, fileName) => {
            //获取了图片的dataURL,可以用来展示，也可转化为File类型上传至后台
            showImg(item, fileName)
        }, ops)
    })
})
//用某个元素触发input的click事件。
//此时将input元素隐藏，再来修改这个元素的样式
choose.addEventListener("click", function() {
    if (input) {
        input.click()
    }
})
//拖动上传事件
dropbox.addEventListener("dragenter", dragenter, false);
dropbox.addEventListener("dragover", dragover, false);
dropbox.addEventListener("drop", drop, false);

function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
}

function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
}

function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    //获取到File类型
    var fileList = inputEventToFile(e)

    fileList.forEach((item, index) => {
        compressImg(item, (item, fileName) => {
            //获取了图片的dataURL,可以用来展示，也可转化为File类型上传至后台
            showImg(item, fileName)
        }, ops)
    })
}
dropbox.addEventListener("click", function() {
    input.click()
})


submit.addEventListener("click",function(){
    upload("http://localhost:3000/file-upload")
})

//批量上传
function upload(URL){
    var imgList=document.querySelectorAll(".img-content img")
    var uploadInfo=document.querySelectorAll(".img-content .upload-info")
    var uploadProgress=document.querySelectorAll(".img-content .upload-progress")

    imgList.forEach(function(item,index){

        var blob= dataURLtoBlob(item.src)
        var file= blobToFile(blob,item.getAttribute("file-name"))
        var form=fileToForm(file,"upload_img")

        uploadForm(URL,form,uploadInfo[index],uploadProgress[index])
    })
}

//上传表单
function uploadForm(URL, form,info,progress) {
    var xhr = new XMLHttpRequest()

    xhr.upload.onprogress = function(e) {
        console.log(e.loaded,e.total)
        if (e.lengthComputable) {
            var percentComplete = Math.round(e.loaded/ e.total);
            info.setAttribute("data-status","uploading")
            progress.setAttribute("value",percentComplete)
        } else {
            console.log('无法计算')
        }
    }
    xhr.onloadend = function(e) {
        if(e.loaded===e.total){
            info.setAttribute("data-status","success")
        }else{
            info.setAttribute("data-status","failed")
        }
    }
    xhr.open("POST", URL);
    xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');
    xhr.send(form)
}


//可选选项
var ops = {
    width: 500,  //最大宽
    height: 500,  //最大高
    quality: 0.92,  //压缩质量
    convertType: "dataURL", //dataURL 或者 blob
    fileType: "png", //文件类型
}

/**
 * [compressImg description]
 * @param  {File}   file     [description]
 * @param  {Function} callback [用于后续处理]
 * @param  {Object}   ops      [压缩选项]
 * @return {Undefined}            [description]
 */
function compressImg(file, callback, ops) {
    var maxWidth = ops.width || 500 //最大尺寸
    var maxHeight = ops.height || 500 //最大尺寸
    quality = ops.quality || 0.92

    var reader = new FileReader()
    var img = new Image()

    img.onload = () => {
        //原始尺寸
        var originWidth = img.width;
        var originHeight = img.height;
        //实际尺寸
        var targetWidth = originWidth
        var targetHeight = originHeight;
        // 图片尺寸超过最大的限制
        if (originWidth > maxWidth || originHeight > maxHeight) {
            if (originWidth / originHeight > maxWidth / maxHeight) {
                // 更宽，按照宽度限定尺寸
                targetWidth = maxWidth;
                targetHeight = Math.round(maxWidth * (originHeight / originWidth));
            } else {
                targetHeight = maxHeight;
                targetWidth = Math.round(maxHeight * (originWidth / originHeight));
            }
        }

        var canvas = document.createElement('canvas');  //创建canvas容器
        var context = canvas.getContext('2d');
        canvas.width = targetWidth   //宽高等于图片宽高
        canvas.height = targetHeight //
        // 清除画布
        context.clearRect(0, 0, targetWidth, targetHeight);
        // 图片压缩
        context.drawImage(img, 0, 0, targetWidth, targetHeight);

        //压缩后传给回调函数
        if (ops.convertType === "dataURL") {
            callback(canvas.toDataURL(), file.name)
        } else if (ops.convertType === "blob") {
            canvas.toBlob(function(blob) {
                callback(blob, file.name)
            }, "image/" + ops.fileType, ops.quality)
        }

    }
    reader.onload = (e) => {
        img.src = e.target.result // 文件base64化，以便获知图片原始尺寸
    }
    reader.onabort = () => console.log('file reading was aborted');
    reader.onerror = () => console.log('file reading has failed');

    //根据MIME类型读取图片
    if (file.type.indexOf("image") !== -1) {
        reader.readAsDataURL(file);
    } else {
        console.log(new Error("输入类型不是图片"))
        return
    }
}

//url以及对应的原始文件名
//展示图片
function showImg(dataURL, fileName) {
    var domStr = `<div class="img-content">
                    <img src="${dataURL}" alt="" class="img" file-name="${fileName}">
                    <div class="upload-info" data-status="hidden">
                        <p class="upload-success">上传成功</p>
                        <p class="upload-failed">上传失败</p>
                        <progress class="upload-progress" value=0></progress>
                    </div>

                </div>`
    imgWrap.innerHTML += domStr
}



//转化为formData格式,name是模拟的input的name
function fileToForm(file, name) {
    var form = new FormData()
    form.append(name, file)
    return form
}

//将input读入文件时的event转化为File类型
function inputEventToFile(event) {
    var dataTransferItemsList = []
    if (event.dataTransfer) {
        var dt = event.dataTransfer
        if (dt.files && dt.files.length) {
            dataTransferItemsList = dt.files
        } else if (dt.items && dt.items.length) {
            // During the drag even the dataTransfer.files is null
            // but Chrome implements some drag store, which is accesible via dataTransfer.items
            dataTransferItemsList = dt.items
        }
    } else if (event.target && event.target.files) {
        dataTransferItemsList = event.target.files
    }
    // Convert from DataTransferItemsList to the native Array
    return Array.prototype.slice.call(dataTransferItemsList)
}



//**dataURL to blob**
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {
        type: mime
    });
}


function blobToFile(blob, fileName) {
    if (blob.type.indexOf("image") === -1) {
        console.log(new Error("输入类型不是图片"))
        return
    }
    return new File([blob], fileName)
}

function fileTodataURL(file) {
    //此方法有兼容性问题;
    //使用后需要用URL.revokeObjectURL(dataURL)来释放内存
    return URL.createObjectURL(file)
}