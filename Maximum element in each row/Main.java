#include<iostream>
using namespace std;
int main()
{ 
    int r,c,i,j,max=0;
cin>>r>>c;
int a[r][c];
for(i=0;i<r;i++)
{
    for(j=0;j<c;j++)
{
    cin>>a[i][j];
}} 
max=a[0][0];
for(i=0;i<r;i++)
{
    max=a[i][0];
for(j=0;j<c;j++)
{
    if
(max<=a[i][j])
max=a[i][j];
}
cout<<max<<"\n";
}}