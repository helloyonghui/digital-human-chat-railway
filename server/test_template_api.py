#!/usr/bin/env python3
"""
测试模板API返回的数据结构
"""

import requests
import json
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_template_api():
    """测试模板列表API"""
    try:
        # 测试模板列表API
        print("=== 测试模板列表API ===")
        response = requests.get("https://motabay.com:8443/templates", verify=False)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("返回数据:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # 检查preview_image字段
            if "templates" in data:
                print("\n=== 模板图片路径检查 ===")
                for name, template_info in data["templates"].items():
                    preview_image = template_info.get("preview_image", "未设置")
                    print(f"模板 {name}: {preview_image}")
                    
                    # 测试图片URL是否可访问
                    if preview_image != "未设置":
                        img_url = f"https://motabay.com:8443{preview_image}"
                        try:
                            img_response = requests.head(img_url, verify=False)
                            print(f"  图片访问测试: {img_response.status_code}")
                        except Exception as e:
                            print(f"  图片访问失败: {e}")
        else:
            print(f"API调用失败: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

if __name__ == "__main__":
    test_template_api()
